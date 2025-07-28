import { Request, RequestHandler, Response } from 'express';
import { Op, Transaction } from 'sequelize';
import { PluginReq, PluginResult } from '../types';
import { ConfigMessage } from '@cdp-forge/types';
import config from '../config/default';
import Plugin from '../models/plugin';
import PlusarProducer from "../pulsarProducer";

const producer = new PlusarProducer(config.pipelinemanager!.config_topic);
producer.connect();

export const register: RequestHandler = async (req: Request, res: Response) => {
  const plugin : PluginReq = req.body;

  if (!plugin || !isValidPlugin(plugin)) {
    res.status(400).end("Invalid plugin");
    return;
  }

  let existingPlugin = await Plugin.findOne({
    where: { name: plugin.name }
  })
  if (existingPlugin) {
    await sendConfigMessage([{
      inputTopic: existingPlugin.inputTopic,
      outputTopic: existingPlugin.outputTopic,
      plugin: plugin.name
    }]);
    // ✅ Aggiungere risposta di successo
    res.status(208).json({
      message: "Plugin already registered"
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
        name: plugin.name,
        type: plugin.type,
        priority: plugin.priority,
        inputTopic: plugins.before[0].outputTopic
      }, { transaction: t });
      
      await sendConfigMessage([{
        inputTopic: newPlugin.inputTopic,
        plugin: plugin.name
      }]);
      await t.commit();
      // ✅ Aggiungere risposta di successo
      res.status(201).json({
        message: "Parallel plugin registered successfully"
      });
      return;
    } 
    if (plugins.parallels.length) {
      newPlugin = await Plugin.create({
        name: plugin.name,
        type: plugin.type,
        priority: plugin.priority,
        inputTopic: plugins.parallels[0].inputTopic,
        outputTopic: plugins.parallels[0].outputTopic
      }, { transaction: t });
      

      await sendConfigMessage([{
        inputTopic: newPlugin.inputTopic,
        plugin: plugin.name
      }]);
      await t.commit();
      // ✅ Aggiungere risposta di successo
      res.status(201).json({
        message: "Plugin registered successfully"
      });
      return;
    } 

    let promises: any[] = [];
    newPlugin = await Plugin.create({
      name: plugin.name,
      type: plugin.type,
      priority: plugin.priority,
      inputTopic: '',
      outputTopic: ''
    }, { transaction: t });
    let newTopic = "logs_" + newPlugin.id;

    if (plugins.after.length) {
      promises.push(newPlugin.update({
        inputTopic: plugins.before[0].outputTopic,
        outputTopic: newTopic
      }, { transaction: t }));
      plugins.after.map(plugin => {
        promises.push(plugin.update({
          inputTopic: newTopic
        }, { transaction: t }).then(plugin => {
          updatedPlugins.push(plugin);
        }));
      });
    } else {
      promises.push(newPlugin.update({
        inputTopic: plugins.before[0].outputTopic,
        outputTopic: newTopic
      }, { transaction: t }));
    }
    promises.push(Plugin.update({
      inputTopic: newTopic
    }, {
      where: {
        type: 'parallel',
        inputTopic: plugins.before[0].outputTopic,
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

  await sendPluginConfiguration(updatedPlugins.concat(newPlugin));
  // ✅ Aggiungere risposta di successo per il caso finale
  res.status(201).json({
    message: "Blocking plugin registered successfully"
  });
};

export const unregister: RequestHandler = async (req: Request, res: Response) => {
  const plugin : { name: string } = req.body;

  if (!plugin || !plugin.name) {
    res.status(400).end("Invalid plugin");
    return;
  }

  let existingPlugin = await Plugin.findOne({
    where: { name: plugin.name }
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
          inputTopic: plugins.before[0].outputTopic
        }, { transaction: t }).then(plugin => {
          updatedPlugins.push(plugin);
        }));
      });
    }
    promises.push(Plugin.update({
      inputTopic: plugins.before[0].outputTopic
    }, {
      where: {
        type: 'parallel',
        inputTopic: existingPlugin.outputTopic,
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

export const sendAllConfig = async (): Promise<any> => {
  return Plugin.findAll().then(Plugins => {
    return sendPluginConfiguration(Plugins);
  });
};

const isValidPlugin = (plugin: PluginReq): boolean => {
  return (
    (plugin.priority > 0 || plugin.name == config.coreStagePluginName) && plugin.priority <= 100 &&
    ['parallel', 'blocking'].includes(plugin.type));
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
  const msges: ConfigMessage[] = updatedPlugins.map((plugin): ConfigMessage => ({
        inputTopic: plugin.inputTopic,
        outputTopic: plugin.outputTopic,
        plugin: plugin.name
      }));
  return sendConfigMessage(msges);
};


const sendConfigMessage = async (configMsgs: ConfigMessage[]) => {
  await producer.send(configMsgs);
}