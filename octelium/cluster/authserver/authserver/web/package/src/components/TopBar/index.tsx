/// <reference types="vite-plugin-svgr/client" />

import * as React from 'react';
import Logo from '@/assets/l03.svg?react';
import { useNavigate } from 'react-router-dom';

import { BsGithub } from 'react-icons/bs';
import { twMerge } from 'tailwind-merge';

const TopBar = () => {
  const navigate = useNavigate();

  return (
    <React.Fragment>
      <nav className="flex h-[60px] w-full items-center border-b-[0px] border-slate-300 px-4">
        <a
          className="flex flex-none items-center justify-center"
          href="https://octelium.com"
          target="_blank"
        >
          <Logo className="h-auto w-40 stroke-cyan-400" />
        </a>
        <div className="flex-grow"></div>
      </nav>
    </React.Fragment>
  );
};

export default TopBar;
