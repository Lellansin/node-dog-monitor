'use strict'

const Redis = require('ioredis')
const schedule = require('node-schedule')

class Monitor {
  constructor (config) {
    this.config = config
    this.name = config.name
    this.pub = new Redis(config.redis)
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
    let sys = {
      name: this.name,
      pid: process.pid,
      mem: process.memoryUsage(),
      uptime: process.uptime(),
      ver: process.versions.node,
      time: new Date()
    }
    let data = {}
    for (var key in this.cache) {
      data[key] = this.cache[key]
      delete this.cache[key]
    }

    this.pub.publish(this.config.channel, JSON.stringify({
      sys: sys,
      data: data
    }))
  }
}

module.exports = Monitor
