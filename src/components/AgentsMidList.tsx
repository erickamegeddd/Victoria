import { useState } from "react";
import client from "../utils/axios";
import { useQuery } from "react-query";
import { Col, List, message, Select } from "antd";

interface Columns {
  mid: string;
  dba: string;
  iso: string;
}

const AgentsMidList = () => {
  const [selectedAgent, setSelectedAgent] = useState<string>("");

  const fetchUniqueAgentsData = async () => {
    const { data } = await client.get<any[]>("/unique-agent-name");
    return data;
  };

  const {
    data: uniqueAgents,
    isLoading: isUniqueAgentsLoading,
    error: uniqueAgentsError,
  } = useQuery("fetchUniqueAgentsData", fetchUniqueAgentsData);

  const fetchMidsPerAgent = async () => {
    const { data } = await client.get<Columns[]>(`/agents-mid-list`, {
      params: {
        agent_name: selectedAgent,
      },
    });
    return data;
  };

  const {
    data: agentMidData,
    error: agentMidError,
    isLoading,
  } = useQuery(["fetchMidsPerAgent", selectedAgent], fetchMidsPerAgent, {
    enabled: !!selectedAgent,
  });

  const handleAgentChange = (value: string) => {
    setSelectedAgent(value);
  };

  if (uniqueAgentsError || agentMidError)
    message.error("Error fetching records");

  return (
    <>
      <Col xxl={6} xl={6} lg={6} md={24} sm={24} xs={24}>
        <Select
          size="large"
          placeholder="Select Agent Name"
          optionLabelProp="label"
          allowClear
          showSearch
          onChange={handleAgentChange}
          filterOption={(input: any, option: any) =>
            (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
          }
          filterSort={(optionA, optionB) =>
            (optionA?.label ?? "")
              .toLowerCase()
              .localeCompare((optionB?.label ?? "").toLowerCase())
          }
          options={uniqueAgents?.map((agent: any) => ({
            value: agent.agent_name,
            label: agent.agent_name,
          }))}
        />
      </Col>
      <List
        dataSource={agentMidData}
        loading={isUniqueAgentsLoading || isLoading}
        renderItem={(item: Columns, index: number) => (
          <List.Item key={index}>
            <List.Item.Meta
              title={item.mid + " | " + item.iso}
              description={item.dba}
            />
          </List.Item>
        )}
      />
    </>
  );
};

export default AgentsMidList;
