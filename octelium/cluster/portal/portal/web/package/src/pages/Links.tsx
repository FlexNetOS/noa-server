import { BsGithub } from 'react-icons/bs';
import { IoBook } from 'react-icons/io5';

const LinkItem = (props: { link: string; children?: React.ReactNode }) => {
  return (
    <div>
      <a
        href={props.link}
        target="_blank"
        className="mb-2 inline-flex w-full items-center text-sm leading-none text-zinc-200 transition-all duration-300 hover:text-white"
      >
        {props.children}
      </a>
    </div>
  );
};

export default () => {
  return (
    <div className="m-2 my-4 flex flex-col rounded-lg border-none bg-zinc-800 p-3 font-bold shadow-lg">
      <LinkItem link="https://github.com/octelium/octelium">
        <BsGithub />
        <span className="ml-2">GitHub Repository</span>
      </LinkItem>

      <LinkItem link="https://octelium.com/docs">
        <IoBook />
        <span className="ml-2">Octelium Docs</span>
      </LinkItem>
    </div>
  );
};
