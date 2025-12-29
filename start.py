#!/usr/bin/env python3
"""
AutoBex 2 - Development Server Startup Script
Starts the Cloudflare Pages development server using Wrangler
"""

import subprocess
import sys
import os
from pathlib import Path

def check_node_installed():
    """Check if Node.js is installed"""
    import shutil
    
    # Check if node command exists
    node_path = shutil.which('node')
    if node_path:
        try:
            result = subprocess.run(['node', '--version'], capture_output=True, text=True, shell=True)
            if result.returncode == 0:
                print(f"✓ Node.js found: {result.stdout.strip()}")
                return True
        except Exception:
            pass
    
    # Try with shell=True on Windows
    try:
        result = subprocess.run(['node', '--version'], capture_output=True, text=True, shell=True)
        if result.returncode == 0:
            print(f"✓ Node.js found: {result.stdout.strip()}")
            return True
    except Exception:
        pass
    
    print("❌ Node.js is not installed or not in PATH. Please install Node.js from https://nodejs.org/")
    return False

def check_npm_installed():
    """Check if npm is installed"""
    import shutil
    
    # Check if npm command exists
    npm_path = shutil.which('npm')
    if npm_path:
        try:
            result = subprocess.run(['npm', '--version'], capture_output=True, text=True, shell=True)
            if result.returncode == 0:
                print(f"✓ npm found: {result.stdout.strip()}")
                return True
        except Exception as e:
            pass
    
    # Try with shell=True on Windows
    try:
        result = subprocess.run(['npm', '--version'], capture_output=True, text=True, shell=True)
        if result.returncode == 0:
            print(f"✓ npm found: {result.stdout.strip()}")
            return True
    except Exception:
        pass
    
    print("❌ npm is not installed or not in PATH. Please install npm.")
    print("   npm usually comes with Node.js. Try reinstalling Node.js from https://nodejs.org/")
    return False

def check_dependencies():
    """Check if node_modules exists"""
    node_modules = Path('node_modules')
    if node_modules.exists():
        print("✓ Dependencies found")
        return True
    else:
        print("⚠ Dependencies not found. Installing...")
        return False

def install_dependencies():
    """Install npm dependencies"""
    print("Installing dependencies...")
    try:
        result = subprocess.run(['npm', 'install'], check=True, shell=True)
        print("✓ Dependencies installed successfully")
        return True
    except subprocess.CalledProcessError:
        print("❌ Failed to install dependencies")
        return False

def start_dev_server():
    """Start the development server"""
    print("\n" + "="*50)
    print("🚀 Starting AutoBex 2 Development Server")
    print("="*50 + "\n")
    
    try:
        # Use npm run dev which runs: wrangler pages dev public
        subprocess.run(['npm', 'run', 'dev'], check=True, shell=True)
    except KeyboardInterrupt:
        print("\n\n👋 Shutting down server...")
        sys.exit(0)
    except subprocess.CalledProcessError as e:
        print(f"\n❌ Error starting server: {e}")
        sys.exit(1)

def main():
    """Main function"""
    print("AutoBex 2 - Development Server Startup")
    print("-" * 50)
    
    # Check prerequisites
    if not check_node_installed():
        sys.exit(1)
    
    if not check_npm_installed():
        sys.exit(1)
    
    # Check and install dependencies if needed
    if not check_dependencies():
        if not install_dependencies():
            sys.exit(1)
    
    # Start the server
    print("\n")
    start_dev_server()

if __name__ == "__main__":
    main()
