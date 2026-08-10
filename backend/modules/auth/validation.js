const { z } = require("zod");

const registerSchema = z
  .object({
    firstName: z.string().min(2, "First name is required").max(100),
    lastName: z.string().max(100).optional(),
    email: z.string().email("A valid email is required").toLowerCase(),
    phone: z
      .string()
      .regex(/^(\+?255|0)?[67][0-9]{8}$/, "Enter a valid Tanzanian phone number"),
    password: z.string().min(8, "Password must be at least 8 characters").max(128),
    confirmPassword: z.string(),
    organizationName: z.string().min(2, "Organization name is required").max(150),
    organizationEmail: z.string().email("A valid organization email is required").toLowerCase().optional(),
    termsAccepted: z.literal(true, {
      message: "You must accept the terms and conditions",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

const loginSchema = z.object({
  email: z.string().email("A valid email is required").toLowerCase(),
  password: z.string().min(1, "Password is required"),
});

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "New password must be at least 8 characters").max(128),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

module.exports = { registerSchema, loginSchema, changePasswordSchema };
