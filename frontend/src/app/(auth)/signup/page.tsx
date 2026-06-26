"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Github, UserPlus } from "lucide-react";
import { motion } from "framer-motion";
import { useAuthActions } from "@/app/hooks/mutations/useAuthActions";
import { RegisterFormValues, registerSchema } from "../../../../types/auth";

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

const CreateAccount = () => {
  const { isPending, socialLoading, signUpWithEmail, continueWithSocial } = useAuthActions();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { username: "", email: "", password: "" },
  });

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="max-w-md md:w-full flex flex-col gap-4 transition-colors duration-300"
    >
      <motion.div
        variants={itemVariants}
        className="bg-gray-100 dark:bg-gray-800 rounded-full p-3 w-min mx-auto transition-colors"
      >
        <UserPlus size={50} className="text-gray-600 dark:text-gray-400" />
      </motion.div>

      <motion.div variants={itemVariants}>
        <h1 className="text-4xl text-gray-700 dark:text-gray-100 font-extrabold text-center">
          Signup
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-1">
          Join our community with all-time access for free
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
          className="w-full flex justify-center items-center gap-2 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-200 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 transition-all duration-300 p-3 font-semibold shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {socialLoading === "google" ? (
            <Loader2 className="animate-spin text-gray-500" size={24} />
          ) : (
            <>
              <img
                src="https://img.icons8.com/material-rounded/120/4D4D4D/google-logo.png"
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
          className="w-full flex justify-center items-center gap-2 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-200 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 transition-all duration-300 p-3 font-semibold shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
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
        onSubmit={handleSubmit(signUpWithEmail)}
        className="flex flex-col gap-4"
        noValidate
      >
        <motion.div variants={itemVariants}>
          <input
            type="text"
            placeholder="Username"
            {...register("username")}
            className={`mt-1 p-3 w-full bg-gray-100 dark:bg-gray-800 border ${errors.username ? "border-red-500" : "border-transparent dark:border-gray-700"} text-gray-900 dark:text-gray-100 outline-none rounded-md focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-600 transition-all`}
          />
          {errors.username && (
            <p className="text-red-500 text-xs mt-1 ml-1">
              {errors.username.message}
            </p>
          )}
        </motion.div>

        <motion.div variants={itemVariants}>
          <input
            type="email"
            placeholder="Email"
            {...register("email")}
            className={`mt-1 p-3 w-full bg-gray-100 dark:bg-gray-800 border ${errors.email ? "border-red-500" : "border-transparent dark:border-gray-700"} text-gray-900 dark:text-gray-100 outline-none rounded-md focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-600 transition-all`}
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
            className={`mt-1 p-3 w-full bg-gray-100 dark:bg-gray-800 border ${errors.password ? "border-red-500" : "border-transparent dark:border-gray-700"} text-gray-900 dark:text-gray-100 outline-none rounded-md focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-600 transition-all`}
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
            className="w-full h-12 flex justify-center items-center bg-gray-800 dark:bg-gray-700 text-white p-3 rounded-md hover:bg-gray-900 dark:hover:bg-gray-600 transition-colors duration-300 font-semibold shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isPending ? (
              <Loader2
                className="animate-spin mx-auto text-gray-200"
                size={24}
              />
            ) : (
              "Create Account"
            )}
          </button>
        </motion.div>
      </form>

      <motion.div
        variants={itemVariants}
        className="text-gray-600 dark:text-gray-400 text-center transition-colors"
      >
        <p>
          Already have an account?
          <Link
            href="/login"
            className="text-gray-800 dark:text-gray-200 hover:underline font-semibold ml-1"
          >
            Login instead
          </Link>
        </p>
      </motion.div>
    </motion.div>
  );
};

export default CreateAccount;
