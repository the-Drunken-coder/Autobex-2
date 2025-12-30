"""
Tests for start.py - Development Server Startup Script
"""
import pytest
import subprocess
import sys
from pathlib import Path
from unittest.mock import patch, MagicMock, Mock
import shutil

# Import the functions from start.py
# Add parent directory to path to import start module
parent_dir = Path(__file__).parent.parent
sys.path.insert(0, str(parent_dir))

# Import start module (need to handle the .py extension)
import importlib.util
spec = importlib.util.spec_from_file_location("start", parent_dir / "start.py")
start = importlib.util.module_from_spec(spec)
spec.loader.exec_module(start)


class TestCheckNodeInstalled:
    """Tests for check_node_installed function"""
    
    @patch('shutil.which')
    @patch('subprocess.run')
    def test_node_found_via_shutil(self, mock_run, mock_which):
        """Test when node is found via shutil.which"""
        mock_which.return_value = '/usr/bin/node'
        mock_run.return_value = Mock(returncode=0, stdout='v18.0.0\n')
        
        result = start.check_node_installed()
        
        assert result is True
        mock_which.assert_called_once_with('node')
        mock_run.assert_called_once()
    
    @patch('shutil.which')
    @patch('subprocess.run')
    def test_node_not_found(self, mock_run, mock_which):
        """Test when node is not found"""
        mock_which.return_value = None
        mock_run.return_value = Mock(returncode=1)
        
        result = start.check_node_installed()
        
        assert result is False
    
    @patch('shutil.which')
    @patch('subprocess.run')
    def test_node_found_via_shell(self, mock_run, mock_which):
        """Test when node is found via shell fallback"""
        mock_which.return_value = None
        mock_run.return_value = Mock(returncode=0, stdout='v18.0.0\n')
        
        result = start.check_node_installed()
        
        assert result is True
        # Should try shell=True fallback
        assert mock_run.call_count >= 1


class TestCheckNpmInstalled:
    """Tests for check_npm_installed function"""
    
    @patch('shutil.which')
    @patch('subprocess.run')
    def test_npm_found_via_shutil(self, mock_run, mock_which):
        """Test when npm is found via shutil.which"""
        mock_which.return_value = '/usr/bin/npm'
        mock_run.return_value = Mock(returncode=0, stdout='9.0.0\n')
        
        result = start.check_npm_installed()
        
        assert result is True
        mock_which.assert_called_once_with('npm')
    
    @patch('shutil.which')
    @patch('subprocess.run')
    def test_npm_not_found(self, mock_run, mock_which):
        """Test when npm is not found"""
        mock_which.return_value = None
        mock_run.return_value = Mock(returncode=1)
        
        result = start.check_npm_installed()
        
        assert result is False


class TestCheckDependencies:
    """Tests for check_dependencies function"""
    
    @patch.object(Path, 'exists')
    def test_dependencies_exist(self, mock_exists):
        """Test when node_modules exists"""
        mock_exists.return_value = True
        
        result = start.check_dependencies()
        
        assert result is True
        mock_exists.assert_called_once()
    
    @patch.object(Path, 'exists')
    def test_dependencies_not_exist(self, mock_exists):
        """Test when node_modules does not exist"""
        mock_exists.return_value = False
        
        result = start.check_dependencies()
        
        assert result is False
        mock_exists.assert_called_once()


class TestInstallDependencies:
    """Tests for install_dependencies function"""
    
    @patch('subprocess.run')
    def test_install_success(self, mock_run):
        """Test successful dependency installation"""
        mock_run.return_value = Mock(returncode=0)
        
        result = start.install_dependencies()
        
        assert result is True
        mock_run.assert_called_once_with(['npm', 'install'], check=True, shell=True)
    
    @patch('subprocess.run')
    def test_install_failure(self, mock_run):
        """Test failed dependency installation"""
        mock_run.side_effect = subprocess.CalledProcessError(1, 'npm install')
        
        result = start.install_dependencies()
        
        assert result is False
        mock_run.assert_called_once()


class TestStartDevServer:
    """Tests for start_dev_server function"""
    
    @patch('subprocess.run')
    def test_start_server_success(self, mock_run):
        """Test successful server start"""
        mock_run.return_value = Mock(returncode=0)
        
        # Should not raise an exception
        try:
            start.start_dev_server()
        except SystemExit:
            pass  # Expected when KeyboardInterrupt is simulated
        
        mock_run.assert_called_once_with(['npm', 'run', 'dev'], check=True, shell=True)
    
    @patch('subprocess.run')
    def test_start_server_keyboard_interrupt(self, mock_run):
        """Test server start with keyboard interrupt"""
        mock_run.side_effect = KeyboardInterrupt()
        
        with pytest.raises(SystemExit):
            start.start_dev_server()
    
    @patch('subprocess.run')
    def test_start_server_error(self, mock_run):
        """Test server start with error"""
        mock_run.side_effect = subprocess.CalledProcessError(1, 'npm run dev')
        
        with pytest.raises(SystemExit):
            start.start_dev_server()

