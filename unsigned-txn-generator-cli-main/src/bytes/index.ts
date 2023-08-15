const intToUintByte = (ele: any, radix: number) => {
  const val = Number(ele).toString(16);
  const noOfZeroes = radix / 4 - val.length;
  let res = '';
  for (let i = 0; i < noOfZeroes; i += 1) {
    res += '0';
  }
  return res + val;
};

const hexToAscii = (str1: any) => {
  const hex = str1.toString();
  let str = '';
  for (let n = 0; n < hex.length; n += 2) {
    str += String.fromCharCode(parseInt(hex.substr(n, 2), 16));
  }
  return str;
};

export { intToUintByte, hexToAscii };
