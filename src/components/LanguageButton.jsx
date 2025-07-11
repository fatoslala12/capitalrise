import { useLanguage } from '../context/LanguageContext';

export default function LanguageButton() {
  const { language, changeLanguage, isAlbanian } = useLanguage();

  const handleClick = () => {
    const newLang = isAlbanian ? 'en' : 'sq';
    changeLanguage(newLang);
  };

  return (
    <button
      onClick={handleClick}
      className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 text-base transition-all mb-3"
      title={isAlbanian ? "Switch to English" : "Ndrysho në Shqip"}
    >
      <span className="text-xl">
        {isAlbanian ? "🇬🇧" : "🇦🇱"}
      </span>
      <span>
        {isAlbanian ? "English" : "Shqip"}
      </span>
    </button>
  );
}