/** Discord に登録するスラッシュコマンドの定義。scripts/register-commands.ts が投げる。 */

const SUB_COMMAND = 1
const INTEGER_OPTION = 4

export const CTF_COMMAND = {
  name: 'ctf',
  description: 'CTFTime のイベントを調べて参加表明する',
  options: [
    {
      type: SUB_COMMAND,
      name: 'upcoming',
      description: '開催予定のイベントを一覧表示する',
      options: [
        {
          type: INTEGER_OPTION,
          name: 'days',
          description: '何日先まで見るか（既定: 14）',
          required: false,
          min_value: 1,
          max_value: 365,
        },
      ],
    },
    {
      type: SUB_COMMAND,
      name: 'joined',
      description: '自分が参加表明したイベントを一覧表示する',
    },
    {
      type: SUB_COMMAND,
      name: 'info',
      description: 'イベントの詳細（AI 利用可否の原文つき）を表示する',
      options: [
        {
          type: INTEGER_OPTION,
          name: 'event_id',
          description: 'CTFTime のイベント id（一覧の /ctf info の後ろの数字）',
          required: true,
        },
      ],
    },
  ],
}

export const COMMANDS = [CTF_COMMAND]
