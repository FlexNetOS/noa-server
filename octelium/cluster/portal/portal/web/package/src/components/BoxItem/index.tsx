export default (props: { children?: React.ReactNode }) => {
  return (
    <div className="my-8 w-full rounded-lg border-[1px] border-gray-300 p-2 shadow-sm">
      {props.children}
    </div>
  );
};
