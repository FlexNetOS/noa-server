import * as React from 'react';
import { Outlet } from 'react-router-dom';
import Footer from '@/components/Footer';
import TopBar from '@/components/TopBar';

import { Toaster } from 'react-hot-toast';

export default () => {
  return (
    <div>
      <title>Octelium Login</title>

      <div className="flex min-h-screen flex-col items-center bg-slate-100 antialiased">
        <TopBar />
        <div className="mb-2"></div>

        <div className="flex w-full flex-1 flex-col items-center">
          <div className="mx-auto mt-2 w-full !max-w-4xl p-2 md:container md:p-4">
            <div>
              <Outlet />
            </div>
          </div>
        </div>

        <Toaster position="bottom-center" />
        <Footer />
      </div>
    </div>
  );
};
