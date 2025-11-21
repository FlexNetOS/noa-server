import { Button } from '@mantine/core';
import { PanelTop, Boxes, LogOut } from 'lucide-react';

import * as React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { twMerge } from 'tailwind-merge';
import { Modal } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useMutation } from '@tanstack/react-query';
import { getClientAuth } from '@/utils/client';
import { LogoutRequest } from '@/apis/userv1/userv1';

const items = [
  {
    title: 'Service',
    url: '/services',
    icon: PanelTop,
  },
  {
    title: 'Namespaces',
    url: '/namespaces',
    icon: Boxes,
  },
];

export default function () {
  const loc = useLocation();
  const [opened, { open, close }] = useDisclosure(false);

  const mutationLogout = useMutation({
    mutationFn: async () => {
      await getClientAuth().logout(LogoutRequest.create());
    },
    onSuccess: () => {
      window.location.reload();
    },
  });

  return (
    <div className="mt-[60px] h-full w-full">
      <div className="flex h-full w-full flex-col">
        <div>
          {items.map((item) => (
            <div key={item.title}>
              <div>
                <Link
                  viewTransition
                  className={twMerge(
                    'font-extrabold transition-all duration-500 hover:bg-slate-200',
                    'flex w-full items-center justify-center',
                    'my-1 rounded-md px-2 py-1',
                    'text-sm',
                    loc.pathname.startsWith(item.url)
                      ? `bg-zinc-800 !text-white shadow-md hover:bg-black`
                      : `text-zinc-600 hover:text-zinc-800`
                  )}
                  to={item.url}
                >
                  <item.icon />
                  <span className="ml-2 flex-1">{item.title}</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
        <div className="flex-1"></div>
        <div>
          <Button fullWidth variant="outline" onClick={open}>
            <LogOut className="mr-1" />
            <span>Logout</span>
          </Button>
        </div>
      </div>

      <Modal opened={opened} onClose={close} centered>
        <div className="mb-4 text-xl font-bold">{`Are you sure that you want to logout?`}</div>

        <div className="mt-4 flex items-center justify-end">
          <Button variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button
            className="ml-4"
            loading={mutationLogout.isPending}
            onClick={() => {
              mutationLogout.mutate();
            }}
            autoFocus
          >
            Yes, Logout
          </Button>
        </div>
      </Modal>
    </div>
  );
}
