// ===============================
// SITEMAP TREE FUNCTIONALITY
// ===============================

// Icon mapping using ASCII/Unicode symbols
const ICONS = {
    FOLDER: '□',
    FILE: '▪',
    EXTERNAL: '➞',
    COLLAPSED: '▶',
    EXPANDED: '▼'
};

// Fetch and build the tree
async function buildSitemapTree() {
    try {
        const response = await fetch('/sitemap/sitemap.json');
        const data = await response.json();
        
        const treeContainer = document.getElementById('sitemapTree');
        const items = data.items;
        buildTree(items, treeContainer, true); // Pass true to expand all
        
    } catch (error) {
        console.error('Error loading sitemap:', error);
        const treeContainer = document.getElementById('sitemapTree');
        if (treeContainer) {
            treeContainer.innerHTML = 
                '<li class="sitemap-error">❌ Failed to load sitemap data</li>';
        }
    }
}

// Build the tree - recursive function
// expanded parameter: true = expand all nodes by default
function buildTree(items, parentUl, expanded = false) {
    items.forEach(item => {
        const li = document.createElement('li');
        
        // Create the node row (parent)
        const nodeDiv = document.createElement('div');
        nodeDiv.className = 'sitemap-tree-node';

        // Toggle button
        const toggle = document.createElement('span');
        toggle.className = 'sitemap-toggle';
        const hasChildren = item.children && item.children.length > 0;
        
        if (!hasChildren) {
            toggle.classList.add('empty');
        } else {
            // If expanded is true, show EXPANDED icon, else COLLAPSED
            toggle.textContent = expanded ? ICONS.EXPANDED : ICONS.COLLAPSED;
        }

        // Icon
        const icon = document.createElement('span');
        icon.className = 'sitemap-icon';
        if (hasChildren) {
            icon.textContent = ICONS.FOLDER;
        } else if (item.url && item.url.startsWith('http')) {
            icon.textContent = ICONS.EXTERNAL;
        } else if (item.url) {
            icon.textContent = ICONS.FILE;
        } else {
            icon.textContent = ICONS.FOLDER;
        }

        // Label
        let labelElement;
        if (item.url) {
            labelElement = document.createElement('a');
            labelElement.href = item.url;
            labelElement.textContent = item.name;
            if (item.target === '_blank') {
                labelElement.target = '_blank';
                const extIcon = document.createElement('span');
                extIcon.className = 'sitemap-external-icon';
                extIcon.textContent = '➞';
                nodeDiv.appendChild(toggle);
                nodeDiv.appendChild(icon);
                nodeDiv.appendChild(labelElement);
                nodeDiv.appendChild(extIcon);
            } else {
                nodeDiv.appendChild(toggle);
                nodeDiv.appendChild(icon);
                nodeDiv.appendChild(labelElement);
            }
        } else {
            labelElement = document.createElement('span');
            labelElement.className = 'sitemap-label-no-link';
            labelElement.textContent = item.name;
            nodeDiv.appendChild(toggle);
            nodeDiv.appendChild(icon);
            nodeDiv.appendChild(labelElement);
        }

        // Add the parent node to the li FIRST
        li.appendChild(nodeDiv);

        // THEN add children (if any) - this makes them appear BELOW
        if (hasChildren) {
            const childrenUl = document.createElement('ul');
            childrenUl.className = 'sitemap-tree-children';
            // Pass expanded down to children so they also expand
            buildTree(item.children, childrenUl, expanded);

            // If expanded is true, add the 'open' class immediately
            if (expanded) {
                childrenUl.classList.add('open');
            }

            // Toggle logic
            toggle.addEventListener('click', (e) => {
                e.stopPropagation();
                const isOpen = childrenUl.classList.toggle('open');
                toggle.textContent = isOpen ? ICONS.EXPANDED : ICONS.COLLAPSED;
            });

            // Also toggle on node click (but not on links)
            nodeDiv.addEventListener('click', (e) => {
                const target = e.target;
                if (target.tagName === 'A' || target === toggle) return;
                const isOpen = childrenUl.classList.toggle('open');
                toggle.textContent = isOpen ? ICONS.EXPANDED : ICONS.COLLAPSED;
            });

            // Append children AFTER the parent node
            li.appendChild(childrenUl);
        }

        parentUl.appendChild(li);
    });
}