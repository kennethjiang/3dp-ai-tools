'use client'; // Needed for usePathname

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation'; // Import usePathname
import { Github } from 'lucide-react'; // Import Github icon
import { cn } from '@/lib/utils'; // Assuming you have a cn utility for classnames

export default function Navbar() {
  const pathname = usePathname();

  const navLinkClasses = (href: string) =>
    cn(
      'hover:text-white transition-colors',
      pathname === href
        ? 'text-white border-b-2 border-blue-500 pb-1' // Active link style
        : 'text-gray-300'
    );

  return (
    <nav className="container mx-auto px-4 py-3 flex justify-between items-center bg-gray-900 border-b border-gray-700 text-gray-100">
      {/* Left Side: Logo and Title */}
      <Link href="/" className="flex items-center space-x-2 text-xl font-bold">
        <Image src="/logo.png" alt="3D Printing AI Tools Logo" width={32} height={32} />
        <span className="text-white">3D Printing AI Tools</span>
      </Link>

      {/* Right Side: Nav Links and GitHub Icon */}
      <div className="flex items-center space-x-6"> {/* Increased spacing */}
        <div className="space-x-4"> {/* Links Group */}
          <Link href="/" className={navLinkClasses('/')}>
            How is it sliced
          </Link>
          <Link href="/troubleshooting" className={navLinkClasses('/troubleshooting')}>
            Print troubleshooting
          </Link>
          {/* Add more links here */}
        </div>

        {/* GitHub Icon Link - Replace '#' with your repo URL */}
        <a
          href="https://github.com/kennethjiang/ai-3mf-analyzer"
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-400 hover:text-white transition-colors"
          aria-label="GitHub Repository"
        >
          <Github size={24} />
        </a>
      </div>
    </nav>
  );
}