import Counter from './counter.model.js';

export const getNextSequence = async (name, prefix, padLength = 5) => {
  const counter = await Counter.findOneAndUpdate(
    { name },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  
  const seqStr = String(counter.seq).padStart(padLength, '0');
  return `${prefix}${seqStr}`;
};

export const generatePaginationMeta = (page, limit, total) => {
  return {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
    total,
    pages: Math.ceil(total / limit)
  };
};
