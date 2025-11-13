import { twMerge } from 'tailwind-merge';

export default (props: { children?: React.ReactNode; outlined?: boolean }) => {
  return (
    <span
      className={twMerge(
        'mx-1 my-1 rounded-full px-2 py-1 text-xs font-bold',
        'flex flex-row items-center',
        props.outlined
          ? `border-[1px] border-gray-400 text-gray-800 shadow-sm`
          : `bg-gray-800 text-white shadow-lg`
      )}
    >
      {props.children}
    </span>
  );
};
