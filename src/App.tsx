import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";

const BG_IMAGE_1 = "/media/mountain-hero.webp";
const BG_IMAGE_2 = "/media/mountain-hero.webp";

const SPOTLIGHT_R = 260;

type Point = {
  x: number;
  y: number;
};

type RevealLayerProps = {
  image: string;
  cursorX: number;
  cursorY: number;
};

function RevealLayer({ image, cursorX, cursorY }: RevealLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const revealRef = useRef<HTMLDivElement>(null);
  const [viewportVersion, setViewportVersion] = useState(0);

  useEffect(() => {
    const sizeCanvas = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      setViewportVersion((version) => version + 1);
    };

    sizeCanvas();
    window.addEventListener("resize", sizeCanvas);

    return () => window.removeEventListener("resize", sizeCanvas);
  }, []);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    const reveal = revealRef.current;
    if (!canvas || !reveal) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    context.clearRect(0, 0, canvas.width, canvas.height);

    const gradient = context.createRadialGradient(
      cursorX,
      cursorY,
      0,
      cursorX,
      cursorY,
      SPOTLIGHT_R,
    );
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.4, "rgba(255,255,255,1)");
    gradient.addColorStop(0.6, "rgba(255,255,255,0.75)");
    gradient.addColorStop(0.75, "rgba(255,255,255,0.4)");
    gradient.addColorStop(0.88, "rgba(255,255,255,0.12)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");

    context.fillStyle = gradient;
    context.beginPath();
    context.arc(cursorX, cursorY, SPOTLIGHT_R, 0, Math.PI * 2);
    context.fill();

    const mask = `url(${canvas.toDataURL()})`;
    reveal.style.maskImage = mask;
    reveal.style.webkitMaskImage = mask;
    reveal.style.maskSize = "100% 100%";
    reveal.style.webkitMaskSize = "100% 100%";
  }, [cursorX, cursorY, viewportVersion]);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
        style={{ display: "none" }}
        aria-hidden="true"
      />
      <div
        ref={revealRef}
        className="absolute inset-0 z-30 bg-cover bg-center bg-no-repeat pointer-events-none"
        style={{ backgroundImage: `url(${image})`, filter: "brightness(0.58)" }}
        aria-hidden="true"
      />
    </>
  );
}

function Logo() {
  return (
    <a href="#top" className="flex items-center gap-2" aria-label="Lithos home">
      <svg
        width="26"
        height="26"
        viewBox="0 0 256 256"
        fill="#ffffff"
        aria-hidden="true"
      >
        <path d="M 256 256 L 128 256 L 0 128 L 128 128 Z M 256 128 L 128 128 L 0 0 L 128 0 Z" />
      </svg>
      <span className="font-playfair text-2xl italic text-white">Lithos</span>
    </a>
  );
}

const navigation = ["Course", "Field Guides", "Geology", "Plans", "Live Tour"];

function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-between p-4 sm:p-5">
      <Logo />

      <div className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 rounded-full border border-white/30 bg-white/20 px-2 py-2 backdrop-blur-md md:flex">
        {navigation.map((item, index) => (
          <button
            key={item}
            type="button"
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              index === 0
                ? "bg-white/20 text-white"
                : "text-white/80 hover:bg-white/20 hover:text-white"
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      <button
        type="button"
        className="hidden rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-gray-900 transition-colors hover:bg-gray-100 md:block"
      >
        Sign Up
      </button>

      <button
        type="button"
        className="grid h-11 w-11 place-items-center rounded-full border border-white/30 bg-white/20 text-white backdrop-blur-md md:hidden"
        aria-label={mobileMenuOpen ? "Close navigation" : "Open navigation"}
        aria-expanded={mobileMenuOpen}
        onClick={() => setMobileMenuOpen((open) => !open)}
      >
        {mobileMenuOpen ? <X size={21} /> : <Menu size={21} />}
      </button>

      {mobileMenuOpen && (
        <div className="absolute top-[calc(100%+4px)] left-4 right-4 flex flex-col rounded-2xl border border-white/25 bg-black/70 p-2 text-white shadow-2xl backdrop-blur-xl md:hidden">
          {navigation.map((item, index) => (
            <button
              key={item}
              type="button"
              className={`rounded-xl px-4 py-3 text-left text-sm font-medium transition-colors hover:bg-white/15 ${
                index === 0 ? "bg-white/15 text-white" : "text-white/80"
              }`}
              onClick={() => setMobileMenuOpen(false)}
            >
              {item}
            </button>
          ))}
          <button
            type="button"
            className="mt-2 rounded-xl bg-white px-4 py-3 text-left text-sm font-semibold text-gray-900"
            onClick={() => setMobileMenuOpen(false)}
          >
            Sign Up
          </button>
        </div>
      )}
    </nav>
  );
}

export default function App() {
  const mouse = useRef<Point>({ x: -999, y: -999 });
  const smooth = useRef<Point>({ x: -999, y: -999 });
  const rafRef = useRef<number>();
  const [cursorPos, setCursorPos] = useState<Point>({ x: -999, y: -999 });

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      mouse.current.x = event.clientX;
      mouse.current.y = event.clientY;
    };

    const animate = () => {
      smooth.current.x += (mouse.current.x - smooth.current.x) * 0.1;
      smooth.current.y += (mouse.current.y - smooth.current.y) * 0.1;
      setCursorPos({ x: smooth.current.x, y: smooth.current.y });
      rafRef.current = window.requestAnimationFrame(animate);
    };

    window.addEventListener("mousemove", handleMouseMove);
    rafRef.current = window.requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (rafRef.current !== undefined) {
        window.cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  return (
    <div
      className="min-h-screen bg-white tracking-[-0.02em]"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      <section
        id="top"
        className="relative h-screen w-full overflow-hidden bg-black"
        style={{ height: "100dvh" }}
      >
        <div
          className="hero-zoom absolute inset-0 z-10 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${BG_IMAGE_1})`, filter: "brightness(0.32)" }}
          aria-hidden="true"
        />

        <RevealLayer
          image={BG_IMAGE_2}
          cursorX={cursorPos.x}
          cursorY={cursorPos.y}
        />

        <div className="pointer-events-none absolute top-[14%] right-0 left-0 z-50 flex flex-col items-center px-5 text-center">
          <h1 className="leading-[0.95] text-white">
            <span
              className="hero-anim hero-reveal font-playfair block text-5xl font-normal italic sm:text-7xl md:text-8xl"
              style={{ letterSpacing: "-0.05em", animationDelay: "0.25s" }}
            >
              Layers hold
            </span>
            <span
              className="hero-anim hero-reveal -mt-1 block text-5xl font-normal sm:text-7xl md:text-8xl"
              style={{ letterSpacing: "-0.08em", animationDelay: "0.42s" }}
            >
              tales of time
            </span>
          </h1>
        </div>

        <div
          className="hero-anim hero-fade absolute bottom-14 left-10 z-50 hidden max-w-[260px] sm:block md:left-14"
          style={{ animationDelay: "0.7s" }}
        >
          <p className="text-sm leading-relaxed text-white/80">
            Every layer of sediment records a chapter of our planet, from ancient seabeds to
            drifting ash, layered across millions of years beneath us.
          </p>
        </div>

        <div
          className="hero-anim hero-fade absolute bottom-10 right-5 left-5 z-50 flex max-w-full flex-col items-start gap-4 sm:bottom-24 sm:right-10 sm:left-auto sm:max-w-[260px] sm:gap-5 md:right-14"
          style={{ animationDelay: "0.85s" }}
        >
          <p className="text-xs leading-relaxed text-white/80 sm:text-sm">
            Our interactive maps let you peel back the crust to trace how stones, fossils, and
            deep time combine to shape the ground beneath your feet.
          </p>
          <button
            type="button"
            className="rounded-full bg-[#e8702a] px-7 py-3 text-sm font-medium text-white transition-all hover:scale-[1.03] hover:bg-[#d2611f] hover:shadow-lg hover:shadow-[#e8702a]/30 active:scale-95"
          >
            Start Digging
          </button>
        </div>
      </section>

      <Navigation />
    </div>
  );
}
