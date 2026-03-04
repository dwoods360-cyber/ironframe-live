import RiskEngine from '@/components/dashboard/RiskEngine';

export default function TestPage() {
  return (
    <main className="p-20 bg-black min-h-screen flex items-center justify-center">
      <div className="w-full max-w-md">
        <h1 className="text-white mb-10 text-center">SENTINEL DASHBOARD</h1>
        <RiskEngine />
      </div>
    </main>
  );
}
