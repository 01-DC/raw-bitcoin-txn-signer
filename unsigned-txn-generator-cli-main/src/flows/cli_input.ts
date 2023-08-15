import inquirer from 'inquirer';

/**
 * Displays
 *
 * @param selections
 * Example
 * @param message
 */
export const query_list = async (
  selections: any[],
  message: string = 'Select your option'
) => {
  const q = await inquirer.prompt([
    {
      type: 'list',
      name: 'choice',
      message,
      choices: selections,
    },
  ]);
  return q.choice;
};

export const query_input = async (message: string) => {
  const q = await inquirer.prompt([
    {
      type: 'input',
      name: 'choice',
      message,
    },
  ]);
  return q.choice;
};

export const query_checkbox = async (
  selections: any[],
  message: string = 'Choose your options'
) => {
  const q = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'choice',
      message,
      choices: selections,
    },
  ]);

  return q.choice;
};

export const query_number = async (message: string) => {
  const q = await inquirer.prompt([
    {
      type: 'number',
      name: 'choice',
      message,
    },
  ]);
  return q.choice;
};
