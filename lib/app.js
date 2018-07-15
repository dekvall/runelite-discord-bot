const fetch = require('node-fetch')
const Discord = require('discord.js')
const config = require('./config')
const commands = require('./commands')
const client = new Discord.Client()
const streamerMessages = new Map()

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`)
  client.setInterval(() => {
    fetch('https://api.github.com/repos/runelite/runelite/tags', {
      headers: {
        Authorization: `token ${config.githubToken}`
      }
    }).then(res => res.json())
      .then(body => {
        const release = body[0]
        const version = release.name.substring(
          release.name.lastIndexOf('-') + 1,
          release.name.length)

        fetch(`https://api.runelite.net/runelite-${version}/session/count`)
          .then(res => res.json())
          .then(body => client.user.setActivity(`${body} players online`))
          .catch(e => console.debug(e))
      }).catch(e => console.debug(e))
  }, 300000)
})

client.on('message', message => {
  if (message.author.bot) {
    return
  }

  if (!message.content.startsWith(config.prefix)) {
    return
  }

  const args = message.content.slice(config.prefix.length).trim().split(/ +/g)
  const command = args.shift().toLowerCase()
  commands(message, command, args)
})

client.on('presenceUpdate', (oldMember, newMember) => {
  if (!newMember.roles.some(r => r.name.toLowerCase() === config.streamerRole.toLowerCase())) {
    return
  }

  const oldUrl = oldMember.presence && oldMember.presence.game && oldMember.presence.game.streaming && oldMember.presence.game.url
  const newUrl = newMember.presence && newMember.presence.game && newMember.presence.game.streaming && newMember.presence.game.url
  const channel = client.channels.find('name', config.streamerChannel)
  const streamerUrl = newUrl || oldUrl || ''
  const streamerId = streamerUrl.replace('https://www.twitch.tv/', '')
  const message = streamerMessages.get(streamerId)

  if (message) {
    message.delete()
  }

  if (!newUrl) {
    return
  }

  fetch(`https://api.twitch.tv/kraken/streams?channel=${streamerId}`, {
    headers: {
      'Client-ID': config.twitchClientId
    }
  }).then(res => res.json())
    .then(body => {
      const stream = body.streams[0]

      if (stream.game.toLowerCase().indexOf('runescape') === -1) {
        return
      }

      const embed = new Discord.RichEmbed()
        .setColor(6570406)
        .setTitle(stream.channel.status)
        .setURL(stream.channel.url)
        .setThumbnail(stream.channel.logo)
        .setAuthor(`${stream.channel.display_name} is now Live on Twitch!`, null, stream.channel.url)
        .setImage(`${stream.preview.medium}`)

      channel.send({embed}).then(m => streamerMessages.set(streamerId, m))
    })
})

client.login(config.discordToken)