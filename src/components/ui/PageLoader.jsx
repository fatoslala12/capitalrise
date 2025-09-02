import LoadingSpinner from "./LoadingSpinner";

export default function PageLoader({ text = "Duke ngarkuar..." }) {
  return (
    <div className="w-full h-full min-h-[60vh] flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <LoadingSpinner size="xl" variant="primary" text={text} />
    </div>
  );
}


