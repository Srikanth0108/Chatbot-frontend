# server/app.py (with MySQL authentication)
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import os
import json
import uuid
from datetime import datetime
import google.generativeai as genai
from dotenv import load_dotenv
import asyncio
import threading
import edge_tts
import time
import logging
from functools import wraps
import mysql.connector
import bcrypt

# Load environment variables
load_dotenv()

app = Flask(__name__)
# Make sure this is set correctly in your Flask app
CORS(app, resources={r"/*": {"origins": "http://localhost:5173"}})
# Setup logging
logging.basicConfig(level=logging.INFO)
app.logger.setLevel(logging.INFO)

# In-memory storage
conversations = {}
messages = {}

# Configure MySQL Connection
def get_db_connection():
    try:
        connection = mysql.connector.connect(
            host=os.getenv("DB_HOST", "localhost"),
            user=os.getenv("DB_USER", "root"),
            password=os.getenv("DB_PASSWORD", ""),
            database=os.getenv("DB_NAME", "chatapp")
        )
        return connection
    except mysql.connector.Error as err:
        app.logger.error(f"Error connecting to MySQL: {err}")
        return None

# Configure Gemini AI
try:
    genai.configure(api_key=os.getenv("GEMINI_API_KEY", "your-api-key"))
    model = genai.GenerativeModel('gemini-2.0-flash-lite')
except Exception as e:
    print(f"Error configuring Gemini AI: {e}")
    model = None

# Configure TTS
TEMP_DIR = "temp_audio"
if not os.path.exists(TEMP_DIR):
    os.makedirs(TEMP_DIR)

class VoiceManager:
    def __init__(self):
        self.voices = {}
        self.voice_lock = threading.Lock()
        self.initialized = False
        self.initializing = False
    
    async def initialize_voices(self):
        """Initialize voice list from Edge TTS"""
        if self.initialized or self.initializing:
            return self.initialized
        
        try:
            self.initializing = True
            voices = await edge_tts.list_voices()
            for voice in voices:
                locale = voice["Locale"]
                if locale not in self.voices:
                    self.voices[locale] = []
                self.voices[locale].append({
                    "name": voice["Name"],
                    "gender": voice["Gender"],
                    "is_neural": "Neural" in voice["Name"]
                })
            self.initialized = True
            app.logger.info("Voices initialized successfully")
            return True
        except Exception as e:
            app.logger.error(f"Voice initialization error: {e}")
            return False
        finally:
            self.initializing = False

    def get_best_voice(self, locale):
        if not self.initialized:
            return "en-US-JennyNeural"
            
        if locale not in self.voices:
            locale = "en-US"
        
        available_voices = self.voices.get(locale, [])
        neural_voices = [v for v in available_voices if v["is_neural"]]
        if neural_voices:
            return neural_voices[0]["name"]
        return available_voices[0]["name"] if available_voices else "en-US-JennyNeural"

voice_manager = VoiceManager()

def async_route(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            return loop.run_until_complete(f(*args, **kwargs))
        finally:
            loop.close()
    return wrapper

# Authentication routes
@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    
    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400
    
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = connection.cursor(dictionary=True)
        cursor.execute("SELECT * FROM user_credentials WHERE email_address = %s", (email,))
        user = cursor.fetchone()
        cursor.close()
        connection.close()
        
        if not user:
            return jsonify({'error': 'Invalid email or password'}), 401
        
        # Check password
        if bcrypt.checkpw(password.encode('utf-8'), user['hashed_password'].encode('utf-8')):
            # Create response with user data (excluding password)
            user_data = {
                'id': user['user_id'],
                'name': user['full_name'],
                'email': user['email_address'],
                'isAdmin': bool(user['is_admin']),
                'jobTitle': user['job_title']
            }
            return jsonify({'user': user_data}), 200
        else:
            return jsonify({'error': 'Invalid email or password'}), 401
    except Exception as e:
        app.logger.error(f"Login error: {e}")
        return jsonify({'error': 'Authentication failed'}), 500

@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    full_name = data.get('fullName')
    email = data.get('email')
    password = data.get('password')
    job_title = data.get('jobTitle', '')
    
    if not full_name or not email or not password:
        return jsonify({'error': 'Name, email and password are required'}), 400
    
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = connection.cursor(dictionary=True)
        
        # Check if email already exists
        cursor.execute("SELECT * FROM user_credentials WHERE email_address = %s", (email,))
        if cursor.fetchone():
            cursor.close()
            connection.close()
            return jsonify({'error': 'Email already registered'}), 409
        
        # Hash the password
        hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
        
        # Insert new user
        insert_query = """
        INSERT INTO user_credentials (full_name, email_address, hashed_password, job_title, is_admin)
        VALUES (%s, %s, %s, %s, %s)
        """
        cursor.execute(insert_query, (full_name, email, hashed_password.decode('utf-8'), job_title, 0))
        connection.commit()
        
        # Get the newly created user ID
        user_id = cursor.lastrowid
        
        cursor.close()
        connection.close()
        
        # Return the user data
        user_data = {
            'id': user_id,
            'name': full_name,
            'email': email,
            'isAdmin': False,
            'jobTitle': job_title
        }
        
        return jsonify({'user': user_data}), 201
    except Exception as e:
        app.logger.error(f"Registration error: {e}")
        return jsonify({'error': 'Registration failed'}), 500

@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.json
    conversation_id = data.get('conversationId')
    user_message = data.get('message')
    user_id = data.get('userId', 'default_user')
    message_history = data.get('messageHistory', [])
    language = data.get('language', 'en')  # Get language preference
    
    if not conversation_id or not user_message:
        return jsonify({'error': 'Missing required parameters'}), 400
    
    # If we received message history from the frontend, use it
    # Otherwise use what's stored on the server
    conversation_messages = message_history if message_history else messages.get(conversation_id, [])
    
    # Add user message to history if using server-side history
    message_id = str(uuid.uuid4())
    user_message_obj = {
        'id': message_id,
        'content': user_message,
        'sender': 'user',
        'timestamp': datetime.now().isoformat()
    }
    
    # Only add the user message if it's not already in the history
    if not message_history:
        conversation_messages.append(user_message_obj)
    
    try:
        # Generate response using Gemini AI
        if model:
            # Create a new chat session with history
            chat = model.start_chat()
            
            # Add previous messages to the chat history
            for msg in conversation_messages:
                if msg['sender'] == 'user':
                    chat.send_message(msg['content'])
            
            # Send the latest user message to get a response
            # Include language instruction
            language_instruction = f"Please respond in {get_language_name(language)}."
            prompt = f"{language_instruction}\n\n{user_message}"
            
            response = chat.send_message(prompt)
            ai_response = response.text
        else:
            # Fallback if Gemini is not configured
            ai_response = f"I'm currently running in demo mode without the Gemini API. In a real implementation, I would provide a response generated by Gemini 2.0 with full conversation context in {get_language_name(language)}."
        
        # Create AI message object
        ai_message_id = str(uuid.uuid4())
        ai_message_obj = {
            'id': ai_message_id,
            'content': ai_response,
            'sender': 'ai',
            'timestamp': datetime.now().isoformat()
        }
        
        # Add AI message to history
        if not message_history:
            conversation_messages.append(ai_message_obj)
            messages[conversation_id] = conversation_messages
        
        # If this is a new conversation, add it to the conversations dict
        if conversation_id not in conversations:
            # Create conversation title from the first user message
            title = user_message[:30] + "..." if len(user_message) > 30 else user_message
            conversations[conversation_id] = {
                'id': conversation_id,
                'title': title,
                'timestamp': datetime.now().isoformat(),
                'userId': user_id
            }
        
        return jsonify({
            'message': ai_response,
            'messageId': ai_message_id,
            'conversationId': conversation_id
        })
        
    except Exception as e:
        print(f"Error generating response: {e}")
        return jsonify({'error': 'Failed to generate response'}), 500

def get_language_name(language_code):
    language_names = {
        'en': 'English',
        'es': 'Spanish',
        'fr': 'French',
        'de': 'German',
        'zh': 'Chinese',
        'ja': 'Japanese',
        'ko': 'Korean',
        'ar': 'Arabic',
        'ru': 'Russian',
        'hi': 'Hindi'
    }
    return language_names.get(language_code, 'English')

@app.route('/initialize', methods=['POST'])
@async_route
async def initialize():
    """Separate endpoint for voice initialization"""
    app.logger.info("Received initialization request")
    if voice_manager.initialized:
        app.logger.info("Voice manager already initialized")
        return jsonify({"status": "success", "message": "Already initialized"})
    
    try:
        app.logger.info("Attempting to initialize voices...")
        success = await voice_manager.initialize_voices()
        if success:
            app.logger.info("Voice initialization completed successfully")
            return jsonify({"status": "success", "message": "Initialization complete"})
        else:
            app.logger.error("Voice initialization failed")
            return jsonify({"status": "error", "message": "Initialization failed"}), 500
    except Exception as e:
        app.logger.error(f"Exception during initialization: {str(e)}")
        return jsonify({"status": "error", "message": f"Initialization error: {str(e)}"}), 500

@app.route('/generate_audio', methods=['GET'])
@async_route
async def generate_audio():
    """Generate and return speech audio"""
    try:
        text = request.args.get('text', '')
        locale = request.args.get('lang', 'en-US')
        message_id = request.args.get('message_id', '')

        if not text:
            return "No text provided", 400

        # Ensure voices are initialized
        if not voice_manager.initialized:
            success = await voice_manager.initialize_voices()
            if not success:
                return "Voice initialization failed", 500

        voice_name = voice_manager.get_best_voice(locale)
        timestamp = int(time.time() * 1000)
        output_file = os.path.join(TEMP_DIR, f"speech_{message_id}_{timestamp}.mp3")
        
        try:
            communicate = edge_tts.Communicate(text, voice_name)
            await communicate.save(output_file)
            
            def cleanup():
                try:
                    if os.path.exists(output_file):
                        os.remove(output_file)
                except Exception as e:
                    app.logger.error(f"Cleanup error: {e}")
            
            response = send_file(output_file, mimetype="audio/mpeg")
            response.call_on_close(cleanup)
            return response
            
        except Exception as e:
            app.logger.error(f"Speech generation error: {e}")
            if os.path.exists(output_file):
                os.remove(output_file)
            return str(e), 500

    except Exception as e:
        app.logger.error(f"Request processing error: {e}")
        return str(e), 500

@app.route('/api/conversations/<conversation_id>/messages', methods=['GET'])
def get_messages(conversation_id):
    conversation_messages = messages.get(conversation_id, [])
    return jsonify(conversation_messages)

@app.route('/api/conversations', methods=['POST'])
def create_conversation():
    data = request.json
    user_id = data.get('userId')
    title = data.get('title', 'New Conversation')
    
    conversation_id = str(uuid.uuid4())
    conversation = {
        'id': conversation_id,
        'title': title,
        'timestamp': datetime.now().isoformat(),
        'userId': user_id
    }
    
    conversations[conversation_id] = conversation
    messages[conversation_id] = []
    
    return jsonify(conversation)

@app.route('/api/conversations/<conversation_id>', methods=['DELETE'])
def delete_conversation(conversation_id):
    if conversation_id in conversations:
        del conversations[conversation_id]
    
    if conversation_id in messages:
        del messages[conversation_id]
    
    return jsonify({'success': True})

if __name__ == '__main__':
    app.run(debug=True)