import type { LanguageSelectorProps, LanguageType } from "../types/types";

const LanguageSelector = ({ selectedLanguage, onLanguageChange }:LanguageSelectorProps) => (
  <div className="mb-4">
    <label className="block text-sm font-medium text-slate-300 mb-2">
      Language
    </label>
    <select
      value={selectedLanguage}
      onChange={(e:React.ChangeEvent<HTMLSelectElement>) => onLanguageChange(e.target.value as LanguageType)}
      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
    >
      <option value="javascript">JavaScript</option>
      <option value="python">Python</option>
      <option value="typescript">TypeScript</option>
    </select>
  </div>
);

export default LanguageSelector;