import Link from 'next/link';
import Image from 'next/image';

export default function Navbar() {
  return (
    <nav className="bg-background border-b p-4">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="flex items-center space-x-2 text-xl font-bold">
          <Image src="/logo.png" alt="3D Printing AI Tools Logo" width={32} height={32} />
          <span>3D Printing AI Tools</span>
        </Link>
        <div className="space-x-4">
          <Link href="/" className="hover:text-primary">
            How is it sliced
          </Link>
          {/* Placeholder for the second tool link */}
          <span className="text-muted-foreground">
            Print troubleshooting {/* Link will be added later */}
          </span>
          {/* Add more links here as new tools are developed */}
        </div>
      </div>
    </nav>
  );
}