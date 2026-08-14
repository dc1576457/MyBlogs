
import React from "react";
import { Link } from "react-router-dom";

function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-950 text-slate-300">

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">

        <div className="grid grid-cols-1 gap-10 md:grid-cols-4">

          {/* Brand */}
          <div className="md:col-span-2">
            <Link to="/" className="inline-flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-xl text-white">
                ⚡
              </div>

              <span className="text-xl font-extrabold text-white">
                Media<span className="text-indigo-400">Tools</span>
              </span>
            </Link>

            <p className="mt-4 max-w-md text-sm leading-6 text-slate-400">
              Simple and powerful tools for working with online media.
              Explore our downloader tools and read helpful technology
              articles.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">
              Quick Links
            </h3>

            <div className="mt-4 flex flex-col gap-3 text-sm">
              <Link
                to="/"
                className="transition hover:text-indigo-400"
              >
                Tools
              </Link>

              <Link
                to="/blogs"
                className="transition hover:text-indigo-400"
              >
                Blogs
              </Link>

             
            </div>
          </div>

          {/* Account */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">
              Account
            </h3>

            <div className="mt-4 flex flex-col gap-3 text-sm">
              <Link
                to="/login"
                className="transition hover:text-indigo-400"
              >
                Login
              </Link>

              <Link
                to="/signup"
                className="transition hover:text-indigo-400"
              >
                Sign Up
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-10 flex flex-col gap-3 border-t border-slate-800 pt-6 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="text-slate-500">
            © {new Date().getFullYear()} MediaTools. All rights reserved.
          </p>

          <p className="text-slate-500">
            Built with React & Tailwind CSS
          </p>
        </div>

      </div>
    </footer>
  );
}

export default Footer;
