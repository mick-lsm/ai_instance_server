import { readdirSync, statSync, lstatSync } from 'fs';
import { join, relative } from 'path';

export async function run({ depth = 3, limit = 50, ignore = [] }) {
    try {
        const currentDir = process.cwd();
        const tree = generateTree(currentDir, '', depth, 0, limit, ignore, currentDir);
        return tree;
    } catch (error) {
        return `ERROR: ${error.message}`;
    }
}

function generateTree(basePath, prefix, maxDepth, currentDepth, limit, ignorePaths, rootPath) {
    if (currentDepth >= maxDepth) {
        return '';
    }

    try {
        const items = readdirSync(basePath);
        let output = '';
        let fileCount = 0;
        
        // Filter and sort items
        const filteredItems = items
            .filter(item => {
                const fullPath = join(basePath, item);
                const relativePath = relative(rootPath, fullPath);
                
                // Check if path should be ignored
                return !ignorePaths.some(ignorePath => 
                    relativePath.includes(ignorePath) || item === ignorePath
                );
            })
            .sort((a, b) => {
                const aPath = join(basePath, a);
                const bPath = join(basePath, b);
                const aIsDir = statSync(aPath).isDirectory();
                const bIsDir = statSync(bPath).isDirectory();
                
                // Directories first, then files
                if (aIsDir && !bIsDir) return -1;
                if (!aIsDir && bIsDir) return 1;
                return a.localeCompare(b);
            });

        filteredItems.forEach((item, index) => {
            if (limit !== -1 && fileCount >= limit) {
                return;
            }
            
            const fullPath = join(basePath, item);
            const isLast = index === filteredItems.length - 1;
            const stats = lstatSync(fullPath);
            const isDirectory = stats.isDirectory();
            const isSymlink = stats.isSymbolicLink();
            
            // Current line prefix
            const connector = isLast ? '└── ' : '├── ';
            output += prefix + connector;
            
            // Item display
            if (isSymlink) {
                output += `${item} -> (symlink)`;
            } else if (isDirectory) {
                output += `${item}/`;
            } else {
                output += item;
                // Add file size for regular files
                output += ` (${formatFileSize(stats.size)})`;
            }
            
            output += '\n';
            
            if (isDirectory && !isSymlink) {
                // Recursively generate subtree
                const newPrefix = prefix + (isLast ? '    ' : '│   ');
                const subtree = generateTree(
                    fullPath, 
                    newPrefix, 
                    maxDepth, 
                    currentDepth + 1, 
                    limit, 
                    ignorePaths,
                    rootPath
                );
                output += subtree;
            }
            
            fileCount++;
        });
        
        return output;
        
    } catch (error) {
        if (error.code === 'EACCES') {
            return prefix + '└── [Permission Denied]\n';
        }
        return prefix + `└── [Error: ${error.message}]\n`;
    }
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}