'use client'; // Needed for usePathname

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation'; // Import usePathname
import { Github, Menu, X } from 'lucide-react'; // Import Github, Menu, X icons
import { cn } from '@/lib/utils'; // Assuming you have a cn utility for classnames
import { useState } from "react";
import { Button } from "@/components/ui/button"; // Import Button

// Define navigation items with name and href
const navItems = [
  { name: "How is it sliced?", href: "/how-is-it-sliced" },
  { name: "Print troubleshooting", href: "/troubleshooting" },
];

export default function Navbar() {
  const pathname = usePathname(); // Get current path
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false); // State for mobile menu visibility

  // Function to determine navigation link classes based on active state
  const navLinkClasses = (href: string, isMobile: boolean = false) =>
    cn(
      'transition-colors',
      isMobile
        ? 'block rounded-md px-3 py-2 text-base font-medium' // Mobile styles
        : 'rounded-md px-3 py-2 text-sm font-medium', // Desktop styles
      pathname === href
        ? 'text-white bg-gray-700' // Active link style
        : 'text-gray-300 hover:bg-gray-700 hover:text-white' // Inactive link style
    );

  return (
    <nav className="bg-gray-900 text-white shadow-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Left Side: Logo and Title */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <Image src="/logo.png" alt="3D Printing AI Tools Logo" width={32} height={32} />
              <span className="text-xl font-semibold">3D Printing AI Tools</span>
            </Link>
          </div>

          {/* Center: Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={navLinkClasses(item.href)}
              >
                {item.name}
              </Link>
            ))}
          </div>

          {/* Right Side: GitHub Icon and Mobile Menu Button */}
          <div className="flex items-center">
             {/* GitHub Icon Link */}
            <a
              href="https://github.com/kennethjiang/ai-3mf-analyzer"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:block text-gray-400 hover:text-white transition-colors mr-4" // Hide on mobile, add margin
              aria-label="GitHub Repository"
            >
              <Github size={24} />
            </a>

            {/* Mobile Menu Button */}
            <div className="flex md:hidden">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-gray-400 hover:text-white"
              >
                <span className="sr-only">Open main menu</span>
                {mobileMenuOpen ? (
                  <X className="block h-6 w-6" aria-hidden="true" />
                ) : (
                  <Menu className="block h-6 w-6" aria-hidden="true" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden">
          <div className="space-y-1 px-2 pb-3 pt-2 sm:px-3">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)} // Close menu on click
                className={navLinkClasses(item.href, true)} // Use mobile styles
              >
                {item.name}
              </Link>
            ))}
             {/* GitHub Icon Link for Mobile */}
             <a
               href="https://github.com/kennethjiang/ai-3mf-analyzer"
               target="_blank"
               rel="noopener noreferrer"
               className="block rounded-md px-3 py-2 text-base font-medium text-gray-300 hover:bg-gray-700 hover:text-white flex items-center space-x-2"
               aria-label="GitHub Repository"
               onClick={() => setMobileMenuOpen(false)} // Close menu on click
             >
               <Github size={20} />
               <span>GitHub</span>
             </a>
          </div>
        </div>
      )}
    </nav>
  );
}