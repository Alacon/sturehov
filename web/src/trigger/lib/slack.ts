import { WebClient } from "@slack/web-api";

const slackToken = process.env.SLACK_TOKEN;  // Replace with your token
const channelId = "C08DD6M5A8Y";  // Replace with your channel ID

const slackClient = new WebClient(slackToken);

const sendMessage = async (item: { title: string, modified: string, url: string } | undefined = undefined) => {
  await slackClient.chat.postMessage({
    channel: channelId,
    text: item?.title ?? 'New Document',
    blocks: item ? [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `\n*${item.title}*\n *${item?.modified}*\n\n🔗 <${item.url}|Se PDF>\n\n`
        }
      }
    ] : []
  });
}


export default sendMessage;
