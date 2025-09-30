const opengds = require("../model/datamodel");

const filterData = async (req, res) => {
  const month = [
    { id: 1, value: "January" },
    { id: 2, value: "February" },
    { id: 3, value: "March" },
    { id: 4, value: "April" },
    { id: 5, value: "May" },
    { id: 6, value: "June" },
    { id: 7, value: "July" },
    { id: 8, value: "August" },
    { id: 9, value: "September" },
    { id: 10, value: "October" },
    { id: 11, value: "November" },
    { id: 12, value: "December" },
  ];

  const years = ["2021", "2022", "2023", "2024"];

  let { startYear, endYear, startMonth, endMonth, year } = req.query;
  let data = [];

  try {
    if (startMonth!="none" && endMonth!="none" && startYear!="none" && endYear!="none" && year=="none") {
      // Ensure numeric values
      startMonth = parseInt(startMonth);
      endMonth = parseInt(endMonth);

      const months = month
        .filter((m) => m.id >= startMonth && m.id <= endMonth)
        .map((m) => m.value);
  
      const startIndex = years.indexOf(startYear);
      const endIndex = years.indexOf(endYear);
      const yearsData = years.slice(startIndex, endIndex + 1); // inclusive
      data = await opengds.aggregate([
        {
          $match: {
            Year: { $in: yearsData },
            Month: { $in: months },
          },
        },
        {
          $group: {
            _id: "$Year",
            monthlyTrends: {
              $push: {
                month: "$Month",
                Benzene: "$Benezene",
                Toluene: "$Toulene",
                NO: "$NoEmmisions",
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            year: "$_id",
            monthlyTrends: 1,
          },
        },
      ]);
    } else if (year!="none" && startMonth!="none" && endMonth!="none" && startYear=="none" && endYear=="none") {
      startMonth = parseInt(startMonth);
      endMonth = parseInt(endMonth);

      const months = month
        .filter((m) => m.id >= startMonth && m.id <= endMonth)
        .map((m) => m.value);
      data = await opengds.aggregate([
        {
          $match: {
            Year: year,
            Month: { $in: months },
          },
        },
        {
          $group: {
            _id: "$Year",
            monthlyTrends: {
              $push: {
                month: "$Month",
                Benzene: "$Benezene",
                Toluene: "$Toulene",
                NO: "$NoEmmisions",
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            year: "$_id",
            monthlyTrends: 1,
          },
        },
      ]);
    } else if (year!="none" && startMonth=="none" && endMonth=="none" && startYear=="none" && endYear=="none") {
      // data = await opengds.find({ Year: year });

       data = await opengds.aggregate([
        {
          $match: {
            Year: year,
          },
        },
        {
          $group: {
            _id: "$Year",
            monthlyTrends: {
              $push: {
                month: "$Month",
                Benzene: "$Benezene",
                Toluene: "$Toulene",
                NO: "$NoEmmisions",
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            year: "$_id",
            monthlyTrends: 1,
          },
        },
      ]);
    } else if (startYear!="none" && endYear!="none"&& startMonth=="none" && endMonth=="none"&& year=="none") {
      const startIndex = years.indexOf(startYear);
      const endIndex = years.indexOf(endYear);

      const yearsData = years.slice(startIndex, endIndex + 1);
      data = await opengds.aggregate([
        {
          $match: {
            Year: { $in: yearsData },
          },
        },
        {
          $group: {
            _id: "$Year",
            monthlyTrends: {
              $push: {
                month: "$Month",
                Benzene: "$Benezene",
                Toluene: "$Toulene",
                NO: "$NoEmmisions",
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            year: "$_id",
            monthlyTrends: 1,
          },
        },
      ]);
    } else {
      return res.status(400).send({ message: "Invalid query parameters" });
    }

    res.status(200).send({ data });
  } catch (error) {
    console.error(error);
    res.status(500).send(error);
  }
};

const savedata = async (req, res) => {
  const promises = req.body.data.map((element) => {
    return new Promise((resolve, reject) => {
      const d = new opengds({
        Year: element.Year,
        Month: element.Month,
        NoEmmisions: element.NoEmmisions,
        Benezene: element.Benezene,
        Toulene: element.Toulene,
        publishedon: element.publishedon,
      });

      resolve(d.save(d));
    });
  });
  try {
    await promises;
    res.status(200).send("done");
  } catch (err) {
    res.status(400).send(err);
  }
};


const addRecord = async (req, res) => {
  try {
    const { Year, Month, NoEmmisions, Benezene, Toulene, publishedon } = req.body;

    const doc = new opengds({
     Year: Year,
     Month: Month,
        Benezene:  Benezene,

     NoEmmisions: NoEmmisions,
     Toulene: Toulene,
     publishedon: publishedon,
    });

    await doc.save();
    res.status(200).send("Record added successfully");
  } catch (err) {
    console.error(err);
    res.status(400).send(err.message || err);
  }
};


const deleteRecord = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await opengds.findByIdAndDelete(id);

    if (!result) {
      return res.status(404).send({ message: "Record not found" });
    }

    res.status(200).send({ message: "Record deleted successfully", result });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Error deleting record", error });
  }
};

const updateRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const result = await opengds.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!result) {
      return res.status(404).send({ message: "Record not found" });
    }

    res.status(200).send({ message: "Record updated successfully", result });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Error updating record", error });
  }
};

const getAllRecords = async (req, res) => {
  try {
    const records = await opengds.find({});  // fetch everything

    res.status(200).send({
      message: "All records fetched successfully",
      records,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Error fetching records", error });
  }
};
module.exports = {
  savedata,
  filterData,
  deleteRecord,
  updateRecord,
  getAllRecords,
  addRecord
};
