export const getUserFromLocalStorage = (): User | null => {
  const userData = localStorage.getItem("user");
  return userData ? (JSON.parse(userData) as User) : null;
};
