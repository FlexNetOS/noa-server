import * as React from 'react';
import { twMerge } from 'tailwind-merge';
import { BsGithub } from 'react-icons/bs';

const Footer = () => {
  return (
    <div className="mb-12 mt-6 w-full bg-inherit pt-8">
      <div className="flex w-full flex-col items-center px-6 md:flex-row">
        <div className="flex w-full flex-col items-center justify-center md:flex-row">
          <div className="flex flex-col">
            <div className="flex items-center justify-center">
              <span className="text-sm font-bold text-slate-700">
                Octelium is Free and Open Source Software
              </span>

              <a
                target="_blank"
                className={twMerge(
                  'text-sm font-extrabold md:text-xl',
                  'mx-4 my-1',
                  'transition-all duration-500',
                  'text-slate-600 hover:text-slate-900'
                )}
                href="https://github.com/octelium/octelium"
              >
                <BsGithub />
              </a>
            </div>

            <div className="flex w-full flex-col items-center justify-center lg:flex-row">
              <a href="https://octelium.com" target="_blank">
                <span className="flex items-center text-sm font-semibold text-gray-500 transition-all duration-300 hover:text-gray-600 sm:text-center">
                  © {new Date().getUTCFullYear()} <span className="ml-1">octelium.com</span>
                </span>
              </a>
              <span className="ml-3 text-sm font-bold text-gray-500">Octelium Labs, LLC</span>
              <span className="ml-3 text-sm font-bold text-gray-500">All rights reserved</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Footer;
