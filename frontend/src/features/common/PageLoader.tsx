interface PageLoaderProps {
  title: string;
  subtitle?: string;
}

export const PageLoader = ({ title, subtitle = 'Loading data...' }: PageLoaderProps) => {
  return (
    <div className="w-full max-w-sm mx-auto bg-white min-h-screen flex flex-col shadow-[0_0_30px_rgba(0,0,0,0.1)]">
      <div className="bg-gradient-to-r from-tms-secondary to-tms-secondary-light text-white px-4 py-6 flex justify-between items-center rounded-b-2xl shadow-md">
        <h1 className="text-xl font-bold">{title}</h1>
      </div>
      <div className="flex-1 pb-24 flex items-center justify-center px-6">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 rounded-full border-4 border-gray-200 border-t-tms-primary animate-spin"></div>
          <p className="mt-3 text-xs text-gray-600">{subtitle}</p>
        </div>
      </div>
    </div>
  );
};
