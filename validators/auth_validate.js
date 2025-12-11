import z from "zod";

export const loginUserSchema = z.object({
  email: z
    .string()
    .trim()
    .email({ message: "please enter valid email id" })
    .max(100, { message: "email must be smaller than 100 char" }),
  password: z
    .string()
    .min(6, { message: "password must be atleast 6 character long" })
    .max(100, { message: "password must be no more than 100 char" })
});

export const RegisterUserSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, { message: "username must be atleast 3 charcter" })
    .max(1000, { message: "username must be smaller than 1000 charcter" }),
  email: z
    .string()
    .trim()
    .email({ message: "please enter valid email id" })
    .max(100, { message: "email must be smaller than 100 char" }),
  password: z
    .string()
    .min(6, { message: "password must be atleast 6 character long" })
    .max(100, { message: "password must be no more than 100 char" })
});
