export type UserRole = "user" | "admin";
export type UserStatus = "active" | "suspended" | "banned";

export type AppUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
};
