// client/src/utils/localStorage.js
export const saveToLocalStorage = (key, data) => {
  try {
    const serializedData = JSON.stringify(data);
    localStorage.setItem(key, serializedData);
  } catch (error) {
    console.error("Error saving to localStorage:", error);
  }
};

export const getFromLocalStorage = (key) => {
  try {
    const serializedData = localStorage.getItem(key);
    if (serializedData === null) {
      return undefined;
    }
    return JSON.parse(serializedData);
  } catch (error) {
    console.error("Error getting from localStorage:", error);
    return undefined;
  }
};
