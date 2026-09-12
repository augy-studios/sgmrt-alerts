'use strict';

// Transport helpers for Telegram Rich Messages (Bot API 10.1+,
// https://core.telegram.org/bots/features#rich-messages).
//
// Every structured view in this bot is a `rich` object:
//     { markdown: <Rich Markdown string>, fallback: <plain text string> }
// `markdown` is sent as the `rich_message` payload so headings, tables and
// lists render natively. `fallback` is plain text carrying the same
// information; it is what we send instead if Telegram rejects the rich
// payload, so no helper here ever surfaces a rich failure to the caller.
//
// Telegraf's ctx.reply / editMessageText don't know about `rich_message`, so
// these go through telegram.callApi() directly. No parse_mode anywhere: the
// rich body is Rich Markdown and the fallback is plain.

function richPayload(rich) {
    return { markdown: rich.markdown };
}

// Editing without reply_markup keeps the old keyboard; an empty inline
// keyboard is what actually removes it.
const NO_BUTTONS = { inline_keyboard: [] };

// Keyboard builders return Telegraf Markup objects ({ reply_markup: {...} }).
function markupOf(keyboard) {
    if (!keyboard) return undefined;
    return keyboard.reply_markup ?? keyboard;
}

function describeError(err) {
    return err?.response?.description || err?.description || err?.message || String(err);
}

function isNotModified(err) {
    return /message is not modified/i.test(describeError(err));
}

// Id of the message a rich send created, for callers that want to edit it later.
function sentMessageId(result) {
    return result?.message_id ?? null;
}

async function sendRichMessage(telegram, chatId, rich, keyboard) {
    const reply_markup = markupOf(keyboard);
    try {
        return await telegram.callApi('sendRichMessage', {
            chat_id: chatId,
            rich_message: richPayload(rich),
            ...(reply_markup ? { reply_markup } : {}),
        });
    } catch (err) {
        console.warn(`[sendRichMessage] rich send failed, falling back: ${describeError(err)}`);
        return telegram.sendMessage(chatId, rich.fallback, reply_markup ? { reply_markup } : {});
    }
}

// Edit by chat + message id. No keyboard => existing keyboard is removed.
async function editRichMessageAt(telegram, chatId, messageId, rich, keyboard) {
    const reply_markup = markupOf(keyboard) ?? NO_BUTTONS;
    try {
        await telegram.callApi('editMessageText', {
            chat_id: chatId,
            message_id: messageId,
            rich_message: richPayload(rich),
            reply_markup,
        });
    } catch (err) {
        if (isNotModified(err)) return;
        console.warn(`[editRichMessageAt] rich edit failed, falling back: ${describeError(err)}`);
        await telegram.editMessageText(chatId, messageId, undefined, rich.fallback, { reply_markup });
    }
}

// Edit the message a callback_query came from - regular chat or inline-mode.
// No keyboard => the message keeps whatever keyboard it already has.
async function editRichMessage(ctx, rich, keyboard) {
    const reply_markup = markupOf(keyboard);
    const query = ctx.callbackQuery;
    const target = query.inline_message_id
        ? { inline_message_id: query.inline_message_id }
        : { chat_id: query.message.chat.id, message_id: query.message.message_id };
    try {
        await ctx.telegram.callApi('editMessageText', {
            ...target,
            rich_message: richPayload(rich),
            ...(reply_markup ? { reply_markup } : {}),
        });
    } catch (err) {
        if (isNotModified(err)) return;
        console.warn(`[editRichMessage] rich edit failed, falling back: ${describeError(err)}`);
        await ctx.telegram.editMessageText(
            target.chat_id,
            target.message_id,
            target.inline_message_id,
            rich.fallback,
            reply_markup ? { reply_markup } : {}
        );
    }
}

module.exports = {
    sendRichMessage,
    editRichMessage,
    editRichMessageAt,
    sentMessageId,
    isNotModified,
};
