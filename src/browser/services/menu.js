"use strict";

import { getBrowserLanguage } from "./language.js";
import { getKeybindings } from "./keybinding.js";

/**
 * The menu items to be displayed in the application.
 */
const menus = [
    {
        label: "{{file}}",
        command: "file",
        children: [
            {
                command: "file.new",
                label: "{{file.new}}",
            },
            {
                command: "file.open",
                label: "{{file.open}}",
            },
            {
                command: "file.open-recent",
                label: "{{file.open-recent}}",
                children: [
                    {
                        id: "recent-files",
                        placeholder: true,
                    }
                ],
            },
            { separator: true },
            {
                command: "file.close",
                label: "{{file.close}}",
            },
            {
                command: "file.close-all",
                label: "{{file.close-all}}",
            },
            { separator: true },
            {
                command: "file.save",
                label: "{{file.save}}",
            },
            {
                command: "file.save-as",
                label: "{{file.save-as}}",
            },
            {
                command: "file.save-a-copy",
                label: "{{file.save-a-copy}}",
            },
            {
                command: "file.save-as-template",
                label: "{{file.save-as-template}}",
            },
            { separator: true },
            {
                command: "file.save-with-history",
                label: "{{file.save-with-history}}",
                // checked: ,
            },
            {
                command: "file.revert",
                label: "{{file.revert}}",
            },
            {
                command: "file.version-history",
                label: "{{file.version-history}}",
            },
            { separator: true },
            {
                command: "file.import",
                label: "{{file.import}}",
            },
            {
                command: "file.place",
                label: "{{file.place}}",
            },
            {
                command: "file.export",
                label: "{{file.export}}",
            },
            { separator: true },
            {
                command: "file.document-setup",
                label: "{{file.document-setup}}",
            },
            { separator: true },
            {
                command: "file.exit",
                label: "{{file.exit}}",
            },
        ],
    },
    {
        label: "{{edit}}",
        command: "edit",
        children: [
            {
                command: "edit.undo",
                label: "{{edit.undo}}",
            },
            {
                command: "edit.redo",
                label: "{{edit.redo}}",
            },
            {
                command: "edit.action-history",
                label: "{{edit.action-history}}",
            },
            { separator: true },
            {
                command: "edit.cut",
                label: "{{edit.cut}}",
            },
            {
                command: "edit.copy",
                label: "{{edit.copy}}",
            },
            {
                command: "edit.paste",
                label: "{{edit.paste}}",
            },
            {
                command: "edit.paste-special",
                label: "{{edit.paste-special}}",
                children: [
                    {
                        command: "edit.paste-special.paste-text-content",
                        label: "{{edit.paste-special.paste-text-content}}",
                    },
                    {
                        command: "edit.paste-special.paste-inner-html",
                        label: "{{edit.paste-special.paste-inner-html}}",
                    },
                    {
                        command: "edit.paste-special.paste-outer-html",
                        label: "{{edit.paste-special.paste-outer-html}}",
                    },
                    {
                        command: "edit.paste-special.paste-style",
                        label: "{{edit.paste-special.paste-style}}",
                    },
                    { separator: true },
                    {
                        command: "edit.paste-special.paste-size",
                        label: "{{edit.paste-special.paste-size}}",
                    },
                    {
                        command: "edit.paste-special.paste-width",
                        label: "{{edit.paste-special.paste-width}}",
                    },
                    {
                        command: "edit.paste-special.paste-height",
                        label: "{{edit.paste-special.paste-height}}",
                    },
                    {
                        command: "edit.paste-special.paste-size-separately",
                        label: "{{edit.paste-special.paste-size-separately}}",
                    },
                    {
                        command: "edit.paste-special.paste-width-separately",
                        label: "{{edit.paste-special.paste-width-separately}}",
                    },
                    {
                        command: "edit.paste-special.paste-height-separately",
                        label: "{{edit.paste-special.paste-height-separately}}",
                    },
                    { separator: true },
                    {
                        command: "edit.paste-special.paste-before",
                        label: "{{edit.paste-special.paste-before}}",
                    },
                    {
                        command: "edit.paste-special.paste-after",
                        label: "{{edit.paste-special.paste-after}}",
                    },
                    {
                        command: "edit.paste-special.paste-first-child",
                        label: "{{edit.paste-special.paste-first-child}}",
                    },
                    {
                        command: "edit.paste-special.paste-last-child",
                        label: "{{edit.paste-special.paste-last-child}}",
                    },
                ],
            },
            {
                command: "edit.delete",
                label: "{{edit.delete}}",
            },
            { separator: true },
            {
                command: "edit.duplicate",
                label: "{{edit.duplicate}}",
            },
            {
                command: "edit.clone",
                label: "{{edit.clone}}",
            },
            { separator: true },
            {
                command: "edit.wrap",
                label: "{{edit.wrap}}",
            },
            {
                command: "edit.unwrap",
                label: "{{edit.unwrap}}",
            },
            { separator: true },
            {
                command: "edit.insert",
                label: "{{edit.insert}}",
            },
            {
                command: "edit.convert-to",
                label: "{{edit.convert-to}}",
            },
            { separator: true },
            {
                command: "edit.move",
                label: "{{edit.move}}",
                children: [
                    {
                        command: "edit.move.move-to-top",
                        label: "{{edit.move.move-to-top}}",
                    },
                    {
                        command: "edit.move.move-up",
                        label: "{{edit.move.move-up}}",
                    },
                    {
                        command: "edit.move.move-down",
                        label: "{{edit.move.move-down}}",
                    },
                    {
                        command: "edit.move.move-to-bottom",
                        label: "{{edit.move.move-to-bottom}}",
                    },
                    { separator: true },
                    {
                        command: "edit.move.outdent-up",
                        label: "{{edit.move.outdent-up}}",
                    },
                    {
                        command: "edit.move.outdent-down",
                        label: "{{edit.move.outdent-down}}",
                    },
                    { separator: true },
                    {
                        command: "edit.move.indent-up",
                        label: "{{edit.move.indent-up}}",
                    },
                    {
                        command: "edit.move.indent-down",
                        label: "{{edit.move.indent-down}}",
                    },
                ],
            },
            { separator: true },
            {
                command: "edit.find-and-replace",
                label: "{{edit.find-and-replace}}",
            },
        ],
    },
    {
        label: "{{layer}}",
        command: "layer",
        children: [
            {
                command: "layer.group",
                label: "{{layer.group}}",
            },
            {
                command: "layer.ungroup",
                label: "{{layer.ungroup}}",
            },
            {
                command: "layer.ungroup-all",
                label: "{{layer.ungroup-all}}",
            },
            { separator: true },
            {
                command: "layer.arrange",
                label: "{{layer.arrange}}",
                children: [
                    {
                        command: "layer.arrange.move-to-front",
                        label: "{{layer.arrange.move-to-front}}",
                    },
                    {
                        command: "layer.arrange.move-forward-one",
                        label: "{{layer.arrange.move-forward-one}}",
                    },
                    { separator: true },
                    {
                        command: "layer.arrange.move-backward-one",
                        label: "{{layer.arrange.move-backward-one}}",
                    },
                    {
                        command: "layer.arrange.move-to-back",
                        label: "{{layer.arrange.move-to-back}}",
                    },
                ],
            },
            {
                command: "layer.align",
                label: "{{layer.align}}",
                children: [
                    {
                        command: "layer.align.align-left",
                        label: "{{layer.align.align-left}}",
                    },
                    {
                        command: "layer.align.align-center",
                        label: "{{layer.align.align-center}}",
                    },
                    {
                        command: "layer.align.align-right",
                        label: "{{layer.align.align-right}}",
                    },
                    { separator: true },
                    {
                        command: "layer.align.align-top",
                        label: "{{layer.align.align-top}}",
                    },
                    {
                        command: "layer.align.align-middle",
                        label: "{{layer.align.align-middle}}",
                    },
                    {
                        command: "layer.align.align-bottom",
                        label: "{{layer.align.align-bottom}}",
                    },
                    { separator: true },
                    {
                        command: "layer.align.space-horizontally",
                        label: "{{layer.align.space-horizontally}}",
                    },
                    {
                        command: "layer.align.space-vertically",
                        label: "{{layer.align.space-vertically}}",
                    },
                    { separator: true },
                    {
                        command: "layer.align.distribute-horizontally",
                        label: "{{layer.align.distribute-horizontally}}",
                    },
                    {
                        command: "layer.align.distribute-vertically",
                        label: "{{layer.align.distribute-vertically}}",
                    },
                ],
            },
            {
                command: "layer.transform",
                label: "{{layer.transform}}",
                children: [
                    {
                        command: "layer.transform.rotate-left",
                        label: "{{layer.transform.rotate-left}}",
                    },
                    {
                        command: "layer.transform.rotate-right",
                        label: "{{layer.transform.rotate-right}}",
                    },
                    { separator: true },
                    {
                        command: "layer.transform.flip-left",
                        label: "{{layer.transform.flip-left}}",
                    },
                    {
                        command: "layer.transform.flip-right",
                        label: "{{layer.transform.flip-right}}",
                    },
                ],
            },
            { separator: true },
            {
                command: "layer.lock",
                label: "{{layer.lock}}",
            },
            {
                command: "layer.unlock",
                label: "{{layer.unlock}}",
            },
            {
                command: "layer.unlock-all",
                label: "{{layer.unlock-all}}",
            },
            { separator: true },
            {
                command: "layer.hide",
                label: "{{layer.hide}}",
            },
            {
                command: "layer.hide-others",
                label: "{{layer.hide-others}}",
            },
            { separator: true },
            {
                command: "layer.show",
                label: "{{layer.show}}",
            },
            {
                command: "layer.show-all",
                label: "{{layer.show-all}}",
            },
        ],
    },
    {
        label: "{{select}}",
        command: "select",
        children: [
            {
                command: "select.all",
                label: "{{select.all}}",
            },
            {
                command: "select.deselect",
                label: "{{select.deselect}}",
            },
            {
                command: "select.reselect",
                label: "{{select.reselect}}",
            },
            {
                command: "select.inverse",
                label: "{{select.inverse}}",
            },
            { separator: true },
            {
                command: "select.parent",
                label: "{{select.parent}}",
                children: [
                    {
                        id: "parent-elements",
                        placeholder: true,
                    }
                ],
            },
            {
                command: "select.same",
                label: "{{select.same}}",
                children: [
                    {
                        command: "select.same.text-color",
                        label: "{{select.same.text-color}}",
                    },
                    {
                        command: "select.same.fill-color",
                        label: "{{select.same.fill-color}}",
                    },
                    {
                        command: "select.same.border-color",
                        label: "{{select.same.border-color}}",
                    },
                    { separator: true },
                    {
                        command: "select.same.transparency",
                        label: "{{select.same.transparency}}",
                    },
                    {
                        command: "select.same.blend-mode",
                        label: "{{select.same.blend-mode}}",
                    },
                    { separator: true },
                    {
                        command: "select.same.object-type",
                        label: "{{select.same.object-type}}",
                    },
                    {
                        command: "select.same.object-label",
                        label: "{{select.same.object-label}}",
                    },
                    {
                        command: "select.same.color-tag",
                        label: "{{select.same.color-tag}}",
                    },
                ],
            },
            {
                command: "select.object",
                label: "{{select.object}}",
                children: [
                    {
                        command: "select.object.shapes",
                        label: "{{select.object.shapes}}",
                    },
                    {
                        command: "select.object.artboards",
                        label: "{{select.object.artboards}}",
                    },
                    { separator: true },
                    {
                        command: "select.object.filled-objects",
                        label: "{{select.object.filled-objects}}",
                    },
                    {
                        command: "select.object.unfilled-objects",
                        label: "{{select.object.unfilled-objects}}",
                    },
                    {
                        command: "select.object.stroked-objects",
                        label: "{{select.object.stroked-objects}}",
                    },
                    {
                        command: "select.object.unstroked-objects",
                        label: "{{select.object.unstroked-objects}}",
                    },
                ],
            },
            { separator: true },
            {
                command: "select.save-selection",
                label: "{{select.save-selection}}",
            },
            {
                command: "select.edit-selection",
                label: "{{select.edit-selection}}",
            },
            {
                command: "select.selection-history",
                label: "{{select.selection-history}}",
            },
        ],
    },
    {
        label: "{{view}}",
        command: "view",
        children: [
            {
                command: "view.zoom",
                label: "{{view.zoom}}",
                children: [
                    {
                        command: "view.zoom.zoom-in",
                        label: "{{view.zoom.zoom-in}}",
                    },
                    {
                        command: "view.zoom.zoom-out",
                        label: "{{view.zoom.zoom-out}}",
                    },
                    { separator: true },
                    {
                        command: "view.zoom.zoom-to-fit",
                        label: "{{view.zoom.zoom-to-fit}}",
                    },
                    {
                        command: "view.zoom.zoom-to-width",
                        label: "{{view.zoom.zoom-to-width}}",
                    },
                    {
                        command: "view.zoom.zoom-to-selection",
                        label: "{{view.zoom.zoom-to-selection}}",
                    },
                    { separator: true },
                    {
                        command: "view.zoom.100-percent",
                        label: "{{view.zoom.100-percent}}",
                    },
                    {
                        command: "view.zoom.200-percent",
                        label: "{{view.zoom.200-percent}}",
                    },
                    {
                        command: "view.zoom.400-percent",
                        label: "{{view.zoom.400-percent}}",
                    },
                    {
                        command: "view.zoom.800-percent",
                        label: "{{view.zoom.800-percent}}",
                    },
                    { separator: true },
                    {
                        command: "view.zoom.actual-size",
                        label: "{{view.zoom.actual-size}}",
                    },
                    {
                        command: "view.zoom.pixel-size",
                        label: "{{view.zoom.pixel-size}}",
                    },
                ],
            },
            {
                command: "view.rotate",
                label: "{{view.rotate}}",
                children: [
                    {
                        command: "view.rotate.rotate-left",
                        label: "{{view.rotate.rotate-left}}",
                    },
                    {
                        command: "view.rotate.rotate-right",
                        label: "{{view.rotate.rotate-right}}",
                    },
                    {
                        command: "view.rotate.rotate-to-selection",
                        label: "{{view.rotate.rotate-to-selection}}",
                    },
                    {
                        command: "view.rotate.reset-rotation",
                        label: "{{view.rotate.reset-rotation}}",
                    },
                ],
            },
            { separator: true },
            {
                command: "view.view-mode",
                label: "{{view.view-mode}}",
                children: [
                    {
                        command: "view.view-mode.outline",
                        label: "{{view.view-mode.outline}}",
                        // checked: ,
                    },
                    { separator: true },
                    {
                        command: "view.view-mode.color-simulation",
                        label: "{{view.view-mode.color-simulation}}",
                        children: [
                            {
                                command: "view.view-mode.color-simulation.none",
                                label: "{{view.view-mode.color-simulation.none}}",
                                // checked: ,
                            },
                            { separator: true },
                            {
                                command: "view.view-mode.color-simulation.protanopia",
                                label: "{{view.view-mode.color-simulation.protanopia}}",
                                // checked: ,
                            },
                            {
                                command: "view.view-mode.color-simulation.deuteranopia",
                                label: "{{view.view-mode.color-simulation.deuteranopia}}",
                                // checked: ,
                            },
                            {
                                command: "view.view-mode.color-simulation.tritanopia",
                                label: "{{view.view-mode.color-simulation.tritanopia}}",
                                // checked: ,
                            },
                            {
                                command: "view.view-mode.color-simulation.achromatopsia",
                                label: "{{view.view-mode.color-simulation.achromatopsia}}",
                                // checked: ,
                            },
                            { separator: true },
                            {
                                command: "view.view-mode.color-simulation.contrast-loss",
                                label: "{{view.view-mode.color-simulation.contrast-loss}}",
                                // checked: ,
                            },
                        ],
                    },
                    { separator: true },
                    {
                        command: "view.view-mode.force-light-scheme",
                        label: "{{view.view-mode.force-light-scheme}}",
                        // checked: ,
                    },
                    {
                        command: "view.view-mode.force-dark-scheme",
                        label: "{{view.view-mode.force-dark-scheme}}",
                        // checked: ,
                    },
                    { separator: true },
                    {
                        command: "view.view-mode.print-media-simulation",
                        label: "{{view.view-mode.print-media-simulation}}",
                        // checked: ,
                    },
                ],
            },
            { separator: true },
            {
                command: "view.show-margin",
                label: "{{view.show-margin}}",
                // checked: ,
            },
            {
                command: "view.customize-margin",
                label: "{{view.customize-margin}}",
            },
            { separator: true },
            {
                command: "view.show-guides",
                label: "{{view.show-guides}}",
                // checked: ,
            },
            {
                command: "view.lock-guides",
                label: "{{view.lock-guides}}",
                // checked: ,
            },
            {
                command: "view.customize-guides",
                label: "{{view.customize-guides}}",
            },
            { separator: true },
            {
                command: "view.show-grid",
                label: "{{view.show-grid}}",
                // checked: ,
            },
            {
                command: "view.customize-grid",
                label: "{{view.customize-grid}}",
            },
            { separator: true },
            {
                command: "view.show-rulers",
                label: "{{view.show-rulers}}",
                // checked: ,
            },
            {
                command: "view.customize-rulers",
                label: "{{view.customize-rulers}}",
            },
            { separator: true },
            {
                command: "view.enable-snapping",
                label: "{{view.enable-snapping}}",
                // checked: ,
            },
            {
                command: "view.customize-snapping",
                label: "{{view.customize-snapping}}",
            },
            { separator: true },
            {
                command: "view.presentation-mode",
                label: "{{view.presentation-mode}}",
                // checked: ,
            },
            { separator: true },
            {
                command: "view.hide-selection-bounding-box",
                label: "{{view.hide-selection-bounding-box}}",
                // checked: ,
            },
            {
                command: "view.hide-hovering-bounding-box",
                label: "{{view.hide-hovering-bounding-box}}",
                // checked: ,
            },
        ],
    },
    {
        label: "{{window}}",
        command: "window",
        children: [
            {
                command: "window.arrange",
                label: "{{window.arrange}}",
                children: [
                    {
                        command: "window.arrange.float",
                        label: "{{window.arrange.float}}",
                    },
                    {
                        command: "window.arrange.float-all",
                        label: "{{window.arrange.float-all}}",
                    },
                    { separator: true, },
                    {
                        command: "window.arrange.dock",
                        label: "{{window.arrange.dock}}",
                    },
                    {
                        command: "window.arrange.dock-all",
                        label: "{{window.arrange.dock-all}}",
                    },
                ],
            },
            { separator: true },
            {
                command: "window.workspace",
                label: "{{window.workspace}}",
                children: [
                    {
                        id: "user-workspaces",
                        placeholder: true,
                    },
                    { separator: true, },
                    {
                        command: "window.workspace.reset-workspace",
                        label: "{{window.workspace.reset-workspace}}",
                    },
                    {
                        command: "window.workspace.new-workspace",
                        label: "{{window.workspace.new-workspace}}",
                    },
                    {
                        command: "window.workspace.manage-workspace",
                        label: "{{window.workspace.manage-workspace}}",
                    },
                ],
            },
            { separator: true, },
            {
                command: "window.extensions",
                label: "{{window.extensions}}",
                children: [
                    {
                        id: "installed-extensions",
                        placeholder: true,
                    },
                ],
            },
            { separator: true, },
            {
                id: "available-panels",
                placeholder: true,
            },
            { separator: true, },
            {
                id: "opened-windows",
                placeholder: true,
            },
        ],
    },
    {
        label: "{{help}}",
        command: "help",
        children: [
            {
                command: "help.quick-start-guide",
                label: "{{help.quick-start-guide}}",
            },
            {
                command: "help.documentation",
                label: "{{help.documentation}}",
            },
            {
                command: "help.show-release-notes",
                label: "{{help.show-release-notes}}",
            },
            { separator: true },
            {
                command: "help.show-all-commands",
                label: "{{help.show-all-commands}}",
            },
            {
                command: "help.keyboard-shortcuts",
                label: "{{help.keyboard-shortcuts}}",
            },
            { separator: true },
            {
                command: "help.search-feature-requests",
                label: "{{help.search-feature-requests}}",
            },
            {
                command: "help.report-issue",
                label: "{{help.report-issue}}",
            },
            { separator: true },
            {
                command: "help.toggle-developer-tools",
                label: "{{help.toggle-developer-tools}}",
            },
            {
                command: "help.open-process-explorer",
                label: "{{help.open-process-explorer}}",
            },
            { separator: true },
            {
                command: "help.check-for-updates",
                label: "{{help.check-for-updates}}",
            },
            { separator: true },
            {
                command: "help.about",
                label: "{{help.about}}",
            },
        ],
    },
];

let compiledMenus = [];

/**
 * Recursively, find and replace placeholders with the corresponding strings.
 */
async function translateLabels(menus) {
    const language = getBrowserLanguage();
    const strings = await window.unwebber.language.translate("menus", language);

    // Skip if no strings are found
    if (! strings) {
        return menus;
    }

    function translateLabel(menuItem) {
        menuItem.label = strings[menuItem.command] || menuItem.label;
        menuItem.children?.forEach(child => translateLabel(child));
    }
    menus.forEach(menu => translateLabel(menu));

    return menus;
}

/**
 * Append keybindings to the menus.
 */
function appendKeybindings(menus) {
    const keybindings = getKeybindings();

    // Skip if no keybindings are found
    if (! keybindings) {
        return menus;
    }

    function appendKeybinding(menuItem) {
        let keybinding = keybindings.filter((kb) => {
            return kb.command === menuItem.command;
        })?.[0]?.keys?.[0];
        if (keybinding) {
            menuItem.keys = keybinding.join("+");
        } else {
            menuItem.keys = "";
        }
        menuItem.children?.forEach(child => appendKeybinding(child));
    }
    menus.forEach(menu => appendKeybinding(menu));

    return menus;
}

/**
 * Get the translated menus.
 */
export function getMenus() {
    return compiledMenus;
}

/**
 * Initialize the compiled menus.
 */
await translateLabels(menus).then((translated) => compiledMenus = translated);
compiledMenus = appendKeybindings(compiledMenus);
