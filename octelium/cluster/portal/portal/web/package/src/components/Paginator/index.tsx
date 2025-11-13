import { ListResponseMeta } from '@/apis/metav1/metav1';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import * as React from 'react';
import { twMerge } from 'tailwind-merge';

import { ActionIcon, Pagination, TextInput } from '@mantine/core';

const Paginator = (props: { meta: ListResponseMeta; path: string }) => {
  const { meta } = props;
  const navigate = useNavigate();
  const totalPages = Math.ceil(meta.totalCount / meta.itemsPerPage);
  const loc = useLocation();
  let [searchParams, _] = useSearchParams();

  if (meta.page == 0 && meta.totalCount <= meta.itemsPerPage) {
    return <React.Fragment></React.Fragment>;
  }

  return (
    <div className="my-4 flex w-full items-center justify-center">
      <Pagination
        total={totalPages}
        radius={'xl'}
        value={meta.page + 1}
        withEdges
        color="#111"
        onChange={(v) => {
          let page = v;
          searchParams.set('common.page', `${page}`);
          navigate(`${loc.pathname}?${searchParams.toString()}`);
          /*
            const i = v;
            if (props.onPageChange) {
              props.onPageChange(i);
            } else if (props.path) {
              navigate(
                `${props.path}${props.path.includes("?") ? "&" : "?"}page=${
                  i - 1
                }`
              );
            }
            */
        }}
      />
      {/*
      <Pagination
        variant="outlined"
        count={totalPages}
        page={meta.page}
        onChange={(i, x) => {
          navigate(
            `${props.path}${props.path.includes("?") ? "&" : "?"}page=${x}`
          );
        }}
      />
      */}
    </div>
  );

  return (
    <div className="flex w-full items-center justify-center">
      <div className="flex w-full flex-wrap items-center justify-center">
        {[...Array(totalPages)].map((e, i) => {
          return (
            <button
              key={i}
              className={twMerge(
                `flex items-center justify-center text-center`,
                'mx-2 my-2 rounded-md px-2 py-1 font-bold text-white shadow-2xl',
                meta.page === i
                  ? `border-[1px] border-slate-900 bg-slate-900`
                  : `border-[1px] border-slate-900 bg-transparent text-slate-700`
              )}
              onClick={() => {
                navigate(`${props.path}${props.path.includes('?') ? '&' : '?'}page=${i}`);
              }}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
};
export default Paginator;
