import { useLanguage } from '../context/LanguageContext';

export default function LanguageButton() {
  const { language, changeLanguage, isAlbanian } = useLanguage();

  const toggleLanguage = () => {
    changeLanguage(isAlbanian ? 'en' : 'sq');
  };

  return (
    <button
      onClick={toggleLanguage}
      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-indigo-700 hover:to-blue-700 text-white px-4 py-3 rounded-xl font-bold shadow-lg flex items-center justify-center gap-3 text-base transition-all mb-3 group"
      title={isAlbanian ? "Switch to English" : "Ndrysho në Shqip"}
    >
      <span className="text-2xl transition-transform group-hover:scale-110">
        {isAlbanian ? "🇬🇧" : "🇦🇱"}
      </span>
      <span className="font-semibold">
        {isAlbanian ? "English" : "Shqip"}
      </span>
    </button>
  );
}