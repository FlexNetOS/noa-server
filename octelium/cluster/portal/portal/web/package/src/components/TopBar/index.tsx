/// <reference types="vite-plugin-svgr/client" />

import * as React from 'react';
import Logo from '@/assets/l03.svg?react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '@/utils/hooks';

const TopBar = () => {
  const navigate = useNavigate();
  const settings = useAppSelector((state) => state.settings);
  const picURL =
    settings.status?.session?.metadata?.picURL ?? settings.status?.user?.metadata?.picURL;

  return (
    <nav className="flex h-[60px] w-full border-b-[0px] border-slate-300 px-4">
      <a
        className="flex flex-none items-center justify-center"
        href="https://octelium.com"
        target="_blank"
      >
        <Logo className="h-auto w-40 stroke-cyan-400" />
      </a>
      <div className="flex-grow"></div>

      <div className="flex flex-none items-center">
        <div className="flex items-center justify-center align-middle">
          <div className="h-10 w-10 rounded-full border-2 border-white font-bold text-gray-600 transition-all duration-300 hover:text-gray-900">
            {picURL ? (
              <img className="h-full w-full rounded-full" src={picURL} alt="User pic" />
            ) : (
              <div className="h-full w-full rounded-full bg-sky-600 transition-all duration-300 hover:bg-indigo-800"></div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default TopBar;
