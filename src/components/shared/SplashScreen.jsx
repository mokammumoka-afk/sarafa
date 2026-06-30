export default function SplashScreen({ imageUrl }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary-900">
      {imageUrl ? (
        <img src={imageUrl} alt="Sarafa Libya" className="w-full h-full object-cover" />
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center font-heading font-bold text-primary-900 text-2xl">
            SL
          </div>
          <p className="font-heading font-bold text-white ltr">Sarafa <span className="text-accent-400">Libya</span></p>
        </div>
      )}
    </div>
  );
}
