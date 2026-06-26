"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, User, Github } from "lucide-react";
import { motion } from "framer-motion";
import { useAuthActions } from "@/app/hooks/mutations/useAuthActions";
import { loginSchema, type LoginFormValues } from "../../../../types/auth"

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 120, damping: 14 },
  },
};

const Login = () => {
  const { isPending, socialLoading, loginWithEmail, continueWithSocial } = useAuthActions();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  return (
    <motion.div
      id="main"
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="max-w-md md:w-full flex flex-col gap-4 transition-colors duration-300"
    >
      <motion.div
        variants={itemVariants}
        className="bg-gray-100 dark:bg-gray-800 rounded-full p-3 w-min mx-auto transition-colors"
      >
        <User size={50} className="text-gray-600 dark:text-gray-400" />
      </motion.div>

      <motion.div variants={itemVariants}>
        <h1 className="text-4xl text-gray-800 dark:text-gray-100 font-extrabold text-center transition-colors">
          Login
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-2">
          Welcome back! Please enter your credentials.
        </p>
      </motion.div>

      <motion.div
        variants={itemVariants}
        className="flex flex-col sm:flex-row items-center justify-between gap-3"
      >
        <button
          type="button"
          onClick={() => continueWithSocial("google")}
          disabled={socialLoading !== null}
          className="w-full flex justify-center items-center gap-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 transition-all duration-300 p-3 font-semibold disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {socialLoading === "google" ? (
            <Loader2 className="animate-spin text-gray-500" size={24} />
          ) : (
            <>
              <img
                src="https://img.icons8.com/material-rounded/66/4D4D4D/google-logo.png"
                alt="Google"
                className="w-5 dark:invert"
              />
              Google
            </>
          )}
        </button>

        <button
          type="button"
          onClick={() => continueWithSocial("github")}
          disabled={socialLoading !== null}
          className="w-full flex justify-center items-center gap-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 transition-all duration-300 p-3 font-semibold disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {socialLoading === "github" ? (
            <Loader2 className="animate-spin text-gray-500" size={24} />
          ) : (
            <>
              <Github size={20} />
              GitHub
            </>
          )}
        </button>
      </motion.div>

      <motion.div
        variants={itemVariants}
        className="flex items-center gap-3 my-2"
      >
        <hr className="w-full border-gray-300 dark:border-gray-700" />
        <span className="text-sm text-gray-500 dark:text-gray-500 text-nowrap">
          or with email
        </span>
        <hr className="w-full border-gray-300 dark:border-gray-700" />
      </motion.div>

      <form
        onSubmit={handleSubmit(loginWithEmail)}
        className="flex flex-col gap-4"
        noValidate
      >
        <motion.div variants={itemVariants}>
          <input
            type="email"
            placeholder="Email"
            {...register("email")}
            className={`p-3 w-full border ${errors.email ? "border-red-500" : "border-gray-200 dark:border-gray-700"} bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none rounded-md focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-600 transition-all`}
          />
          {errors.email && (
            <p className="text-red-500 text-xs mt-1 ml-1">
              {errors.email.message}
            </p>
          )}
        </motion.div>

        <motion.div variants={itemVariants}>
          <input
            type="password"
            placeholder="Password"
            {...register("password")}
            className={`p-3 w-full border ${errors.password ? "border-red-500" : "border-gray-200 dark:border-gray-700"} bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none rounded-md focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-600 transition-all`}
          />
          {errors.password && (
            <p className="text-red-500 text-xs mt-1 ml-1">
              {errors.password.message}
            </p>
          )}
        </motion.div>

        <motion.div variants={itemVariants}>
          <button
            type="submit"
            disabled={isPending || socialLoading !== null}
            className="w-full flex justify-center items-center bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 p-2.5 rounded-md hover:bg-gray-800 dark:hover:bg-gray-300 transition-colors duration-300 font-semibold text-center cursor-pointer shadow-md disabled:opacity-70 disabled:cursor-not-allowed h-12"
          >
            {isPending ? (
              <Loader2
                className="animate-spin mx-auto text-current"
                size={24}
              />
            ) : (
              "Login"
            )}
          </button>
        </motion.div>
        <motion.div variants={itemVariants}>

          <button
            type="button"
            disabled={isPending || socialLoading !== null}
            onClick={() =>
              loginWithEmail({
                email: "guest@example.com",
                password: "guestpassword123",
              })
            }
            className="w-full flex justify-center items-center bg-transparent border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 p-2.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-300 font-semibold text-center cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed h-12"
          >
            Continue as Guest
          </button>
        </motion.div>
      </form>

      <motion.div
        variants={itemVariants}
        className="text-gray-600 dark:text-gray-400 text-center transition-colors"
      >
        <p>
          Don't have an account?{" "}
          <Link
            href="/signup"
            className=" text-gray-800 dark:text-gray-200 hover:underline font-semibold"
          >
            Create Account
          </Link>
        </p>
      </motion.div>
    </motion.div>
  );
};

export default Login;
