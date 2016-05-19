'use strict'

const Redis = require('ioredis')
const schedule = require('node-schedule')
const moment = require('moment')

class Monitor {
  constructor (config) {
    this.config = config
    this.name = config.name
    this.redis = new Redis(config.redis)
    let time = config.time || '*/1 * * * *'
    schedule.scheduleJob(time, this.report.bind(this))
    this.cache = {}
  }

  acc (evnt, data) {
    if (!this.cache[evnt]) this.cache[evnt] = 0
    this.cache[evnt] += data || 1
  }

  max (evnt, data) {
    if (!this.cache[evnt]) this.cache[evnt] = 0
    if (data > this.cache[evnt]) this.cache[evnt] = data
  }

  report () {
    let pid = process.pid, now = moment(),
      today = now.format('YYYY-MM-DD'),
      minute = now.format('HH:mm')
    let res = {
      data: {},
      sys: {
        name: this.name,
        pid: pid,
        mem: process.memoryUsage(),
        uptime: process.uptime(),
        ver: process.versions.node,
        time: new Date()
    }}

    for (var key in this.cache) {
      res.data[key] = this.cache[key]
      delete this.cache[key]
    }

    let str = JSON.stringify(res)

    this.redis.publish(this.config.channel, `MSG:alive||${this.name}||${pid}`)
    this.redis.setex(`${this.config.channel}-process|${this.name}|${pid}`, 61) // 61 秒过期
    this.redis.hset(`${this.config.channel}|${today}|${this.name}|${pid}`, minute, str)
  }
}

module.exports = Monitor
