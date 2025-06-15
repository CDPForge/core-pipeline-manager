import { Request, RequestHandler, Response } from 'express';
import { Op, Transaction } from 'sequelize';
import { PluginReq, PluginResult } from '../types';
import Config from '../config';
import Plugin from '../models/plugin';

export const register: RequestHandler = async (req: Request, res: Response) => {
  const plugin : PluginReq = req.body;

  if (!plugin || !isValidPlugin(plugin)) {
    res.status(400).end("Invalid plugin");
    return;
  }

  let existingPlugin = await Plugin.findOne({
    where: { name: plugin.plugin_name }
  })
  if (existingPlugin) {
    await existingPlugin.update({
      callback_url: plugin.callback_url
    });
    res.json({
      exists: true,
      inputTopic: existingPlugin.input_topic,
      outputTopic: existingPlugin.output_topic
    });
    return;
  }

  const t = await Plugin.sequelize!.transaction();
  let plugins: PluginResult = await getPlugins(plugin.priority, t);
  let updatedPlugins: Plugin[] = [];
  let newPlugin: Plugin;

  try {
    if (plugin.type == 'parallel') {
      newPlugin = await Plugin.create({
        name: plugin.plugin_name,
        type: plugin.type,
        priority: plugin.priority,
        callback_url: plugin.callback_url,
        input_topic: plugins.before[0].output_topic
      }, { transaction: t });
      

      res.json({
        inputTopic: newPlugin.input_topic
      });
      return;
    } 
    if (plugins.parallels.length) {
      newPlugin = await Plugin.create({
        name: plugin.plugin_name,
        type: plugin.type,
        priority: plugin.priority,
        callback_url: plugin.callback_url,
        input_topic: plugins.parallels[0].input_topic,
        output_topic: plugins.parallels[0].output_topic
      }, { transaction: t });
      

      res.json({
        inputTopic: newPlugin.input_topic
      });
      return;
    } 

    let promises: any[] = [];
    newPlugin = await Plugin.create({
      name: plugin.plugin_name,
      type: plugin.type,
      priority: plugin.priority,
      callback_url: plugin.callback_url,
      input_topic: '',
      output_topic: ''
    }, { transaction: t });
    let newTopic = "logs_" + newPlugin.id;

    if (plugins.after.length) {
      promises.push(newPlugin.update({
        input_topic: plugins.before[0].output_topic,
        output_topic: newTopic
      }, { transaction: t }));
      plugins.after.map(plugin => {
        promises.push(plugin.update({
          input_topic: newTopic
        }, { transaction: t }).then(plugin => {
          updatedPlugins.push(plugin);
        }));
      });
    } else {
      promises.push(newPlugin.update({
        input_topic: plugins.before[0].output_topic,
        output_topic: newTopic
      }, { transaction: t }));
    }
    promises.push(Plugin.update({
      input_topic: newTopic
    }, {
      where: {
        type: 'parallel',
        input_topic: plugins.before[0].output_topic,
        priority: { [Op.gt]: newPlugin.priority }
      },
      returning: true,
      transaction: t
    }).then(res => {
      updatedPlugins.concat(res[1]);
    }));
    await Promise.all(promises);

    await t.commit();
  } catch (error ) {
    await t.rollback();
    res.status(500).end((error as Error).message);
    return;
  }

  await sendPluginConfiguration(updatedPlugins);
  res.json({
    inputTopic: newPlugin.input_topic,
    outputTopic: newPlugin.output_topic
  });
};

export const unregister: RequestHandler = async (req: Request, res: Response) => {
  const plugin : { plugin_name: string } = req.body;

  if (!plugin || !plugin.plugin_name) {
    res.status(400).end("Invalid plugin");
    return;
  }

  let existingPlugin = await Plugin.findOne({
    where: { name: plugin.plugin_name }
  })
  if (!existingPlugin) {
    res.status(404).end("Plugin not found");
    return;
  }

  const t = await Plugin.sequelize!.transaction();
  let plugins: PluginResult = await getPlugins(existingPlugin.priority, t);
  let updatedPlugins: Plugin[] = [existingPlugin];

  try {
    if (existingPlugin.type == 'parallel' || plugins.parallels.some(plugin => plugin.name != existingPlugin.name)) {
      await existingPlugin.destroy({ transaction: t });
      await sendPluginConfiguration(updatedPlugins);

      res.status(204).end();
      return;
    }

    let promises: any[] = [];
    promises.push(existingPlugin.destroy({ transaction: t }));

    if (plugins.after.length) {
      plugins.after.map(plugin => {
        promises.push(plugin.update({
          input_topic: plugins.before[0].output_topic
        }, { transaction: t }).then(plugin => {
          updatedPlugins.push(plugin);
        }));
      });
    }
    promises.push(Plugin.update({
      input_topic: plugins.before[0].output_topic
    }, {
      where: {
        type: 'parallel',
        input_topic: existingPlugin.output_topic,
        priority: { [Op.gt]: existingPlugin.priority }
      },
      returning: true,
      transaction: t
    }).then(res => {
      updatedPlugins.concat(res[1]);
    }));
    await Promise.all(promises);

    await t.commit();
  } catch (error ) {
    await t.rollback();
    res.status(500).end((error as Error).message);
    return;
  }

  await sendPluginConfiguration(updatedPlugins);
  res.status(204).end();
};

const isValidPlugin = (plugin: PluginReq): boolean => {
  return (
    typeof plugin.plugin_name === 'string' &&
    typeof plugin.priority === 'number' && (plugin.priority > 0 || plugin.plugin_name == Config.getInstance().config.plugin.plugin_name) && plugin.priority <= 100 &&
    typeof plugin.type === 'string' && ['parallel', 'blocking'].includes(plugin.type) &&
    typeof plugin.callback_url === 'string'
  );
};

const getPlugins = async (priority: number, t: Transaction): Promise<PluginResult> => {
  let plugins = await Plugin.findAll({
    where: { type: { [Op.not]: 'parallel' } },
    order: [['priority', 'ASC']],
    lock: true,
    transaction: t
  });

  let ret : PluginResult = {
    before: [],
    after: [],
    parallels: []
  };

  plugins.map(plugin => {
    if (plugin.priority < priority) {
      if (ret.before.length && ret.before[0].priority == plugin.priority) ret.before.push(plugin);
      else ret.before = [plugin];
    } else if (plugin.priority == priority) {
      ret.parallels.push(plugin);
    } else {
      if (!ret.after.length) ret.after.push(plugin);
      else if (ret.after[0].priority == plugin.priority) ret.after.push(plugin);
    }
  });

  return ret;
};

const sendPluginConfiguration = (updatedPlugins: Plugin[]): Promise<any> => {
  let promises: any[] = [];
  updatedPlugins.map(plugin => {
    promises.push(fetch(plugin.callback_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputTopic: plugin.input_topic,
        outputTopic: plugin.output_topic
      })
    }).catch(console.log));
  });

  return Promise.all(promises);
};
