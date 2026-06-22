export default function BackgroundGlow() {
  return (
    <div className="background-glow fixed inset-0 pointer-events-none overflow-hidden">
      <div
        className="
          absolute
          top-[-150px]
          left-[-100px]

          w-[600px]
          h-[600px]

          glow-primary

          blur-[180px]

          rounded-full
        "
      />

      <div
        className="
          absolute
          bottom-[-200px]
          right-[-100px]

          w-[500px]
          h-[500px]

          glow-secondary

          blur-[180px]

          rounded-full
        "
      />
    </div>
  );
}
