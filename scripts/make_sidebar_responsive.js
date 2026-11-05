const fs = require('fs');
const filePath = 'engineering-commons-vscode/src/views/engineeringCommonsSidebarWebviewProvider.ts';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Fix html & body
content = content.replace(
    /html\s*\{[^}]*overflow-x:[^;]+;[^}]*\}/m,
    `html {
            overflow-x: hidden;
            overflow-y: auto;
            width: 100%;
            height: 100%;
        }`
);

content = content.replace(
    /body\s*\{[\s\S]*?min-width:\s*100%;[\s\S]*?overflow-x:[^;]+;[\s\S]*?\}/m,
    `body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, system-ui, sans-serif;
            background: var(--page-bg);
            color: var(--text-primary);
            padding: 6px 6px 36px;
            font-size: 13px;
            line-height: 1.45;
            user-select: none;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            width: 100%;
            min-width: 0;
            max-width: 100%;
            overflow-x: hidden;
            overflow-y: auto;
            box-sizing: border-box;
        }`
);

// 2. Fix .panel
content = content.replace(
    /\.panel\s*\{[\s\S]*?min-width:\s*450px;[\s\S]*?\}/m,
    `.panel {
            background: var(--panel-bg);
            border: 1px solid var(--border);
            border-radius: 12px;
            overflow: hidden;
            box-shadow: none;
            width: 100%;
            min-width: 0;
            max-width: 100%;
            box-sizing: border-box;
        }`
);

// 3. Fix .art-action and buttons
content = content.replace(
    /\.art-action\s*\{[\s\S]*?min-width:\s*max-content;[\s\S]*?\}\s*\.art-action\s*\.btn-install,\s*\.art-action\s*\.installed-tag\s*\{[\s\S]*?flex-shrink:\s*0;[\s\S]*?\}/m,
    `.art-action {
            display: flex;
            flex-wrap: wrap;
            gap: 4px;
            align-items: center;
            width: 100%;
            min-width: 0;
            padding-top: 4px;
            box-sizing: border-box;
        }
        .art-action .btn-install,
        .art-action .installed-tag {
            flex: 1 1 calc(25% - 4px);
            min-width: 50px;
            max-width: 100%;
            height: 26px;
            font-size: 10.5px;
            font-weight: 600;
            padding: 3px 6px;
            border-radius: 6px;
            border: 1px solid var(--btn-border);
            background: var(--btn-bg);
            color: var(--btn-text);
            cursor: pointer;
            transition: all 0.16s;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 3px;
            white-space: nowrap;
            box-sizing: border-box;
            flex-shrink: 1;
            text-decoration: none;
        }`
);

// 4. Fix media queries block
const mediaStart = content.indexOf('@media (max-width: 380px)');
const mediaEnd = content.indexOf('@media (min-width: 500px)');

if (mediaStart !== -1 && mediaEnd !== -1) {
    const responsiveBlock = `@media (max-width: 400px) {
            body {
                padding: 4px 4px 28px !important;
                overflow-x: hidden !important;
                max-width: 100% !important;
                width: 100% !important;
            }
            .panel {
                border-radius: 10px !important;
                min-width: 0 !important;
                max-width: 100% !important;
                width: 100% !important;
                box-sizing: border-box !important;
            }
            .user-header-banner {
                padding: 6px 8px !important;
                gap: 5px !important;
            }
            .user-header-top {
                gap: 5px !important;
            }
            .user-email-text {
                font-size: 11px !important;
                max-width: 140px !important;
            }
            .user-role-pill {
                font-size: 8.5px !important;
                padding: 1px 4px !important;
            }
            .theme-toggle-btn {
                padding: 2px 6px !important;
                font-size: 10px !important;
                height: 22px !important;
            }
            .switch-account-btn, .logout-btn {
                height: 25px !important;
                font-size: 10.5px !important;
                padding: 3px 6px !important;
            }
            .tabbar {
                padding: 5px 6px !important;
                gap: 3px !important;
            }
            .tab {
                padding: 5px 3px !important;
                font-size: 11px !important;
            }
            .tab .tab-label {
                font-size: 11px !important;
            }
            .search-row {
                padding: 6px 8px 4px !important;
            }
            .search-input, .search-box {
                font-size: 11.5px !important;
                padding: 6px 10px 6px 28px !important;
            }
            .artifact-list {
                padding: 0 6px 6px !important;
            }
            .artifact-row, .market-item-card {
                padding: 8px !important;
                gap: 6px !important;
            }
            .art-action {
                display: flex !important;
                flex-wrap: wrap !important;
                gap: 4px !important;
                width: 100% !important;
                min-width: 0 !important;
                box-sizing: border-box !important;
            }
            .art-action .btn-install,
            .art-action .installed-tag {
                flex: 1 1 calc(33.333% - 4px) !important;
                min-width: 48px !important;
                max-width: 100% !important;
                height: 25px !important;
                font-size: 10.5px !important;
                padding: 2px 4px !important;
                display: inline-flex !important;
                align-items: center !important;
                justify-content: center !important;
                box-sizing: border-box !important;
                flex-shrink: 1 !important;
            }
            .art-action .btn-text {
                display: inline-block !important;
                font-size: 10.5px !important;
            }
            .art-action .btn-icon {
                font-size: 10.5px !important;
                margin: 0 !important;
            }
            .art-action .installed-tag svg {
                width: 11px !important;
                height: 11px !important;
            }
            .bounty-card {
                padding: 9px 10px !important;
                border-radius: 9px !important;
                gap: 6px !important;
            }
            .bounty-card-actions {
                flex-wrap: wrap !important;
                gap: 4px !important;
            }
            .bounty-card-actions > * {
                flex: 1 1 calc(50% - 4px) !important;
            }
            .review-box-item {
                padding: 8px 10px !important;
            }
        }

        @media (max-width: 320px) {
            .user-email-text {
                max-width: 100px !important;
            }
            .art-action .btn-install,
            .art-action .installed-tag {
                flex: 1 1 calc(50% - 4px) !important;
            }
            .tab {
                font-size: 10.5px !important;
                padding: 5px 2px !important;
            }
            .tab .tab-label {
                font-size: 10.5px !important;
            }
            .tab .badge, .tab .badge-count {
                font-size: 9px !important;
                min-width: 15px !important;
                height: 15px !important;
                padding: 0 3px !important;
            }
            .bounty-card-actions > * {
                flex: 1 1 100% !important;
            }
        }

        @media (max-width: 250px) {
            body {
                padding: 2px 2px 20px !important;
            }
            .user-email-text {
                max-width: 70px !important;
            }
            .tabbar {
                flex-direction: column !important;
                gap: 3px !important;
            }
            .tab {
                width: 100% !important;
                justify-content: space-between !important;
                padding: 5px 8px !important;
            }
            .art-action .btn-install,
            .art-action .installed-tag {
                flex: 1 1 100% !important;
            }
        }

        `;
    content = content.substring(0, mediaStart) + responsiveBlock + content.substring(mediaEnd);
    console.log('Replaced media queries block successfully');
} else {
    console.log('Could not find media query boundaries: ' + mediaStart + ', ' + mediaEnd);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Updated engineeringCommonsSidebarWebviewProvider.ts successfully');
