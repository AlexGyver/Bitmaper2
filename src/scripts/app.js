import { EL } from "@alexgyver/component";
import { toggleDark } from "./ui";
import { help_text } from "./help";

export let app = {};

export function initApp() {
    EL.update(document.body, {
        ctx: app,
        children: [
            {
                tag: 'header',
                children: [
                    {
                        class: 'bt_btns',
                        children: [
                            {
                                class: 'bt_btn icon bars',
                                onClick: () => {
                                    app.$ui_in.classList.toggle('ui_hidden');
                                    app.$ui_out.classList.add('ui_hidden');
                                }
                            },
                            {
                                class: 'bt_btn icon code',
                                onClick: () => {
                                    app.$ui_in.classList.add('ui_hidden');
                                    app.$ui_out.classList.toggle('ui_hidden');
                                }
                            },
                            {
                                class: 'icon info',
                                onClick: () => {
                                    app.$help.classList.toggle('hidden');
                                }
                            },
                        ]
                    },
                    {
                        text: 'Bitmaper v2',
                    },
                    {
                        style: 'display:flex',
                        child: {
                            class: 'icon moon',
                            onClick: e => toggleDark(),
                        }
                    }
                ]
            },
            {
                tag: 'main',
                children: [
                    {
                        class: 'ui_in',
                        $: 'ui_in',
                    },
                    {
                        class: 'ui_out ui_hidden',
                        $: 'ui_out',
                    },
                    {
                        class: 'cv_col',
                        children: [
                            {
                                tag: 'canvas',
                                $: 'cvimg',
                            },
                            {
                                tag: 'canvas',
                                $: 'cvres',
                            }
                        ]
                    }
                ]
            },
            {
                class: 'help_overlay hidden',
                $: 'help',
                onClick: e => {
                    app.$help.classList.toggle('hidden');
                },
                child: {
                    class: 'help_cont',
                    children: [
                        {
                            html: help_text,
                        }
                    ],
                    // click: e => e.stopPropagation(),
                }
            }
        ]
    });
}