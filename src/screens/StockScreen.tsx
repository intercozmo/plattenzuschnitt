export default function StockScreen({ onNext }: { onNext: () => void }) {
  return <div className="p-4"><h1 className="text-xl font-bold">Plattenbestand</h1><button onClick={onNext} className="mt-4 bg-blue-600 text-white px-4 py-2 rounded">Weiter</button></div>
}
