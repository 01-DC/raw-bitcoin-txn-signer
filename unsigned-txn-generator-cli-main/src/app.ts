// ToDo ask suraj sir about the added_coins in recievetransaction flow
import dotenv from 'dotenv-flow';
dotenv.config();

import cli_tool from './cli';

cli_tool().catch((err) => console.log(err));
