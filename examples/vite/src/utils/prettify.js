import { J } from "./joins";

function getJoin(obj) {
  obj.type;
  if (typeof obj.join === "string") {
    return obj.join;
  }
  if (obj.offset === undefined) {
    return obj.join;
  }
  if (typeof obj.offset === "number") {
    return obj.join + obj.offset;
  }
  if (typeof obj.offset?.[obj.type] === "number") {
    return obj.offset?.[obj.type] + obj.join;
  }
  return obj.join;
}

function PrettyPrint(obj) {
  const result = {
    boolean: {},
    number: {},
    string: {},
  };
  const total = { boolean: 0, number: 0, string: 0 };

  function recurse(current, prefix = "") {
    for (const key in current) {
      if ("type" in current[key]) {
        const fullKey = `${prefix}${key}`;

        const v = { join: getJoin(current[key]) };
        if (current[key].dir !== undefined) {
          v.dir = current[key].dir;
        }
        const type = current[key].type;
        result[type][fullKey] = v;
        total[type]++;
      } else if (Array.isArray(current[key])) {
        current[key].forEach((item, i) => {
          const fullKey = `${prefix}${key}[${i}]`;
          const v = { join: getJoin(item) };
          if (item.dir !== undefined) {
            v.dir = item.dir;
          }
          const type = item.type;
          result[type][fullKey] = v;
          total[type]++;
        });
      } else {
        recurse(current[key], `${prefix}${key}.`);
      }
    }
  }
  recurse(obj);
  return { result, total };
}

console.log(stringify(PrettyPrint(J), { maxLength: 1000 }));

