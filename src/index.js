/**
 * Created by tusharmathur on 5/15/15.
 */
'use strict'
import Rx from 'rx'
import _ from 'lodash'
import {createFD, initParams, save, initialize, downloadMTD} from './Utils'
import * as ob from './Transformers'

const initMTD = (ob, fd, options) => {
  const initialMETA = initialize(ob, options)
  return save(ob, fd, initialMETA)
}

export class Download {
  constructor (ob, options) {
    this.options = initParams(options)
    this.ob = ob
    this.fd = createFD(ob, this.options.mtdPath)
    this.stats = new Rx.BehaviorSubject()
    this.toStat = _.curry((event, message) => this.stats.onNext({event, message}))
    this.toStat('INIT', this.options)
  }

  start () {
    return this
      .init()
      .flatMap(() => this.download())
  }

  init () {
    return initMTD(this.ob, this.fd('w'), this.options)
      .tap(this.toStat('CREATE'))
  }

  download () {
    const fd = this.fd('r+')
    const options = this.options
    const ob = this.ob
    return downloadMTD(ob, fd)
      .tap(this.toStat('DATA'))
      .last()
      .flatMap((x) => ob.fsTruncate(options.mtdPath, x.totalBytes))
      .tap(this.toStat('TRUNCATE'))
      .flatMap(() => ob.fsRename(options.mtdPath, options.path))
      .tap(this.toStat('RENAME'))
      .tapOnCompleted((x) => this.stats.onCompleted())
  }

  stop () {
  }
}

export const createDownload = (options) => new Download(ob, options)
